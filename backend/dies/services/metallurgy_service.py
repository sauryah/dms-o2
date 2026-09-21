import json
import logging
import math
import shutil
import subprocess
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# Predefined Johnson-Cook parameters matching the Julia metallurgy-analytics engine
JOHNSON_COOK_MATERIALS = {
    "copper": {
        "name": "Copper (Cu-ETP)",
        "A": 90.0,
        "B": 292.0,
        "n": 0.31,
        "C": 0.025,
        "m": 1.09,
        "eps_dot_0": 1.0,
        "T_ref": 20.0,
        "T_melt": 1085.0,
        "density": 8940.0,
        "cp": 385.0,
        "taylor_quinney": 0.90,
    },
    "high_carbon_steel": {
        "name": "High-Carbon Steel (AISI 1070)",
        "A": 450.0,
        "B": 530.0,
        "n": 0.26,
        "C": 0.014,
        "m": 1.03,
        "eps_dot_0": 1.0,
        "T_ref": 20.0,
        "T_melt": 1460.0,
        "density": 7850.0,
        "cp": 486.0,
        "taylor_quinney": 0.90,
    },
    "aluminum": {
        "name": "Aluminum (Al 1350-O)",
        "A": 50.0,
        "B": 140.0,
        "n": 0.28,
        "C": 0.015,
        "m": 1.15,
        "eps_dot_0": 1.0,
        "T_ref": 20.0,
        "T_melt": 660.0,
        "density": 2705.0,
        "cp": 900.0,
        "taylor_quinney": 0.90,
    },
    "brass": {
        "name": "Cartridge Brass (CuZn30)",
        "A": 112.0,
        "B": 505.0,
        "n": 0.42,
        "C": 0.009,
        "m": 1.68,
        "eps_dot_0": 1.0,
        "T_ref": 20.0,
        "T_melt": 955.0,
        "density": 8530.0,
        "cp": 380.0,
        "taylor_quinney": 0.90,
    },
}


class MetallurgyService:
    """
    Python wrapper and integration layer for the DMS-O2 Metallurgy Analytics Engine.
    Executes Archard wear regression, Johnson-Cook viscoplastic flow stress, and
    Weibull tool reliability modeling.

    Prioritizes running via the compiled Julia CLI daemon / Docker container;
    falls back seamlessly to local high-precision analytical Python math when
    the external engine is not deployed in the host path.
    """

    @classmethod
    def run_analysis(cls, mode: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Submits an analysis payload to the Julia engine or Python fallback.
        """
        payload = {"mode": mode, "data": data}
        
        # Try running via external Julia CLI or Docker container
        cli_result = cls._try_external_engine(payload)
        if cli_result is not None:
            return cli_result

        # Analytical Python fallback
        return cls._run_fallback(mode, data)

    @classmethod
    def analyze_wear_progression(
        cls,
        tonnage: List[float],
        wear_um: List[float],
        tolerance_um: float = 8.0,
    ) -> Dict[str, Any]:
        """
        Fits Archard power-law wear progression W(t) = a * t^b.
        """
        return cls.run_analysis(
            "archard",
            {
                "tonnage": tonnage,
                "wear_um": wear_um,
                "tolerance_um": tolerance_um,
            },
        )

    @classmethod
    def analyze_viscoplasticity(
        cls,
        material: str,
        strain: float,
        strain_rate: float = 1.0,
        temperature_c: float = 20.0,
    ) -> Dict[str, Any]:
        """
        Computes Johnson-Cook dynamic flow stress under high strain rate and thermal softening.
        """
        return cls.run_analysis(
            "johnson_cook",
            {
                "material": material,
                "strain": strain,
                "strain_rate": strain_rate,
                "temperature_c": temperature_c,
            },
        )

    @classmethod
    def analyze_tool_reliability(cls, lifetimes: List[float]) -> Dict[str, Any]:
        """
        Fits a 2-parameter Weibull reliability distribution using Benard's median ranks.
        """
        return cls.run_analysis(
            "weibull",
            {
                "lifetimes": lifetimes,
            },
        )

    # -------------------------------------------------------------------------
    # External Process Execution (Julia CLI / Docker)
    # -------------------------------------------------------------------------
    @classmethod
    def _try_external_engine(cls, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        raw_json = json.dumps(payload)

        # 1. Try local Julia CLI
        if shutil.which("julia"):
            try:
                proc = subprocess.run(
                    ["julia", "--project=services/metallurgy-analytics", "services/metallurgy-analytics/src/cli.jl"],
                    input=raw_json,
                    text=True,
                    capture_output=True,
                    timeout=10,
                )
                if proc.returncode == 0:
                    parsed = json.loads(proc.stdout)
                    if parsed.get("status") == "success":
                        return parsed
            except Exception as e:
                logger.debug(f"Local Julia invocation skipped: {e}")

        # 2. Try Docker container
        if shutil.which("docker"):
            try:
                proc = subprocess.run(
                    ["docker", "run", "-i", "--rm", "dms-metallurgy-analytics:latest"],
                    input=raw_json,
                    text=True,
                    capture_output=True,
                    timeout=15,
                )
                if proc.returncode == 0:
                    parsed = json.loads(proc.stdout)
                    if parsed.get("status") == "success":
                        return parsed
            except Exception as e:
                logger.debug(f"Docker Julia invocation skipped: {e}")

        return None

    # -------------------------------------------------------------------------
    # Analytical Python Mathematical Fallback
    # -------------------------------------------------------------------------
    @classmethod
    def _run_fallback(cls, mode: str, data: Dict[str, Any]) -> Dict[str, Any]:
        if mode == "archard":
            return cls._fallback_archard(data)
        elif mode == "johnson_cook":
            return cls._fallback_johnson_cook(data)
        elif mode == "weibull":
            return cls._fallback_weibull(data)
        return {
            "status": "error",
            "message": f"Unsupported analysis mode: {mode}",
        }

    @classmethod
    def _fallback_archard(cls, data: Dict[str, Any]) -> Dict[str, Any]:
        tonnage = [float(x) for x in data.get("tonnage", [])]
        wear = [float(x) for x in data.get("wear_um", [])]
        tolerance = float(data.get("tolerance_um", 8.0))

        if len(tonnage) < 2 or len(tonnage) != len(wear):
            return {
                "status": "error",
                "message": "At least 2 data points required for wear regression",
            }

        # Filter positive pairs for log transform
        valid_pairs = [(t, w) for t, w in zip(tonnage, wear) if t > 0 and w > 0]
        if len(valid_pairs) < 2:
            return {
                "status": "error",
                "message": "At least 2 positive data points required for log regression",
            }

        log_t = [math.log(p[0]) for p in valid_pairs]
        log_w = [math.log(p[1]) for p in valid_pairs]

        n = len(log_t)
        mean_t = sum(log_t) / n
        mean_w = sum(log_w) / n

        ss_tt = sum((t - mean_t) ** 2 for t in log_t)
        ss_tw = sum((t - mean_t) * (w - mean_w) for t, w in zip(log_t, log_w))

        b_exp = ss_tw / ss_tt if ss_tt != 0 else 1.0
        log_a = mean_w - b_exp * mean_t
        a_coeff = math.exp(log_a)

        # R^2 and RMSE
        ss_tot = sum((w - mean_w) ** 2 for w in log_w)
        ss_res = sum((w - (log_a + b_exp * t)) ** 2 for t, w in zip(log_t, log_w))
        r2 = 1.0 - (ss_res / ss_tot) if ss_tot > 0 else 1.0

        pred_wear = [a_coeff * (p[0] ** b_exp) for p in valid_pairs]
        rmse = math.sqrt(sum((pw - p[1]) ** 2 for pw, p in zip(pred_wear, valid_pairs)) / n)

        # Regime classification
        if b_exp < 0.60:
            regime = "Sub-Linear / Run-in Polish"
        elif b_exp <= 1.15:
            regime = "Steady-State Abrasive"
        else:
            regime = "Accelerating / Catastrophic Wear"

        # Life forecast
        tonnage_limit = (tolerance / a_coeff) ** (1.0 / b_exp) if a_coeff > 0 and b_exp > 0 else 0.0
        last_t = valid_pairs[-1][0]
        last_w = valid_pairs[-1][1]
        remaining = max(0.0, tonnage_limit - last_t)
        life_pct = min(100.0, (last_w / tolerance) * 100.0) if tolerance > 0 else 100.0

        return {
            "status": "success",
            "model": "archard_wear",
            "results": {
                "a_coeff": round(a_coeff, 6),
                "b_exp": round(b_exp, 4),
                "r_squared": round(max(0.0, min(1.0, r2)), 4),
                "rmse_um": round(rmse, 4),
                "wear_regime": regime,
                "predicted_tonnage_limit": round(tonnage_limit, 1),
                "remaining_tonnage": round(remaining, 1),
                "life_consumed_percent": round(life_pct, 2),
            },
        }

    @classmethod
    def _fallback_johnson_cook(cls, data: Dict[str, Any]) -> Dict[str, Any]:
        mat_key = str(data.get("material", "copper")).lower().replace("-", "_").replace(" ", "_")
        params = JOHNSON_COOK_MATERIALS.get(mat_key, JOHNSON_COOK_MATERIALS["copper"])

        strain = max(0.0, float(data.get("strain", 0.35)))
        strain_rate = max(1e-6, float(data.get("strain_rate", 1.0)))
        temp_c = float(data.get("temperature_c", 20.0))

        # 1. Strain hardening
        term_strain = params["A"] + params["B"] * (strain ** params["n"])

        # 2. Strain rate sensitivity
        rate_ratio = strain_rate / params["eps_dot_0"]
        term_rate = 1.0 + params["C"] * math.log(max(1.0, rate_ratio))

        # 3. Thermal softening
        t_homologous = max(0.0, min(1.0, (temp_c - params["T_ref"]) / (params["T_melt"] - params["T_ref"])))
        term_temp = max(0.0, 1.0 - (t_homologous ** params["m"]))

        flow_stress = term_strain * term_rate * term_temp

        # Adiabatic temperature rise (Taylor-Quinney)
        rho_cp = params["density"] * params["cp"]
        delta_t = (params["taylor_quinney"] * (flow_stress * 1e6) * strain) / rho_cp if rho_cp > 0 else 0.0

        return {
            "status": "success",
            "model": "johnson_cook",
            "material": params["name"],
            "results": {
                "flow_stress_mpa": round(flow_stress, 2),
                "static_stress_mpa": round(term_strain, 2),
                "strain_rate_enhancement_factor": round(term_rate, 4),
                "thermal_softening_factor": round(term_temp, 4),
                "homologous_temperature": round(t_homologous, 4),
                "adiabatic_temp_rise_c": round(delta_t, 1),
            },
        }

    @classmethod
    def _fallback_weibull(cls, data: Dict[str, Any]) -> Dict[str, Any]:
        lifetimes = sorted([float(x) for x in data.get("lifetimes", []) if float(x) > 0])
        n = len(lifetimes)
        if n < 3:
            return {
                "status": "error",
                "message": "At least 3 positive lifetime data points required for Weibull estimation",
            }

        # Benard's median rank regression
        x = [math.log(t) for t in lifetimes]
        y = [math.log(-math.log(1.0 - (i + 1 - 0.3) / (n + 0.4))) for i in range(n)]

        mean_x = sum(x) / n
        mean_y = sum(y) / n

        ss_xx = sum((xi - mean_x) ** 2 for xi in x)
        ss_xy = sum((xi - mean_x) * (yi - mean_y) for xi, yi in zip(x, y))

        beta = ss_xy / ss_xx if ss_xx != 0 else 1.0
        alpha = mean_y - beta * mean_x

        eta = math.exp(-alpha / beta) if beta != 0 else 1.0

        # R^2
        ss_tot = sum((yi - mean_y) ** 2 for yi in y)
        ss_res = sum((yi - (alpha + beta * xi)) ** 2 for xi, yi in zip(x, y))
        r2 = 1.0 - (ss_res / ss_tot) if ss_tot > 0 else 1.0

        # Characteristic metrics
        b10 = eta * ((-math.log(0.90)) ** (1.0 / beta))
        b50 = eta * ((math.log(2.0)) ** (1.0 / beta))
        mttc = eta * math.gamma(1.0 + 1.0 / beta)

        if beta < 0.95:
            mechanism = "Infant Mortality / Early Defect"
        elif beta <= 1.20:
            mechanism = "Random Failures / Constant Hazard"
        elif beta <= 2.50:
            mechanism = "Early Wearout"
        else:
            mechanism = "Wear-Out / Steady Degradation"

        return {
            "status": "success",
            "model": "weibull_reliability",
            "results": {
                "beta_shape": round(beta, 4),
                "eta_scale": round(eta, 2),
                "r_squared": round(max(0.0, min(1.0, r2)), 4),
                "b10_life": round(b10, 1),
                "b50_median_life": round(b50, 1),
                "mttc_mean_life": round(mttc, 1),
                "failure_mechanism": mechanism,
            },
        }
