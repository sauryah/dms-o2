# Business Rules & Logic (BUSINESS_RULES.md)

This ledger defines the domain constraints, sizing validators, tool calculations, and profile mutation checks enforced across the DMS-O2 system.

---

## 1. User Profile Mutation & Guard Checks

### 1.1 The Role & Tool Access Rule
*   **Rule**: Modifying user roles, `is_authorized_for_tools`, or the list of `authorized_tools` is restricted to `ROOT` users or superusers.
*   **Why**: Prevents non-root accounts from granting themselves administrative roles or calculator tool access permissions.
*   **Enforced**: Inside the serialization validation layer of user profiles.
*   **Files**: [profile.py](file:///home/sahil/Desktop/Projects/dms-o2/backend/users/serializers/profile.py#L28-L30) (`UserSerializer.validate`).
*   **Failure Mode**: Non-root accounts could execute privilege escalations to access administrative views.
*   **Engineering Directive**: Any serializer modification containing role or permission fields must explicitly check:
    ```python
    if 'role' in attrs or 'is_authorized_for_tools' in attrs or 'authorized_tools' in attrs:
        if not request or not request.user or (request.user.role != 'ROOT' and not request.user.is_superuser):
            raise serializers.ValidationError({"role": "Only ROOT users can modify user roles or authorize users for tools."})
    ```

### 1.2 ROOT Self-Demotion & Deactivation Guard
*   **Rule**: A user with the `ROOT` role is blocked from changing their own role to something other than `ROOT` or setting `is_active` to `False`.
*   **Why**: Prevents administrative lockouts where the sole `ROOT` user demotes or deactivates themselves.
*   **Enforced**: User serializer validators.
*   **Files**: [profile.py](file:///home/sahil/Desktop/Projects/dms-o2/backend/users/serializers/profile.py#L36-L40).
*   **Failure Mode**: The system could be left without any active `ROOT` administrator, requiring direct database intervention.
*   **Engineering Directive**: Enforce self-demotion checks on user self-updates:
    ```python
    if self.instance.role == 'ROOT':
        if 'role' in attrs and attrs['role'] != 'ROOT':
            raise serializers.ValidationError({"role": "A ROOT user cannot demote themselves."})
        if 'is_active' in attrs and not attrs['is_active']:
            raise serializers.ValidationError({"is_active": "A ROOT user cannot deactivate themselves."})
    ```

---

## 2. Die Identification & Type Validators

### 2.1 Die ID Format
*   **Rule**: Every Die ID must consist solely of alphanumeric characters, hyphens, underscores, dots, and slashes.
*   **Why**: Prevents script injections or invalid filenames when generating PDF or Excel reports for specific dies.
*   **Enforced**: [validation_service.py](file:///home/sahil/Desktop/Projects/dms-o2/backend/dies/services/validation_service.py#L7-L15) (`ValidationService.validate_die_id`).
*   **Files**: Used during single additions and spreadsheet imports.
*   **Failure Mode**: SQL or HTML script injections, or broken report links in the UI.
*   **Engineering Directive**: Enforce regex match `^[a-zA-Z0-9_\-./]+$` on Die IDs before database insert:
    ```python
    if not re.match(r'^[a-zA-Z0-9_\-./]+$', val):
        raise ValueError("Die ID can only contain alphanumeric characters, hyphens, underscores, dots, and slashes.")
    ```

---

## 3. Tool Recutting / Re-boring Workflow

### 3.1 Sizing Expansion Constraint
*   **Rule**: Recutting a ROUND die requires the new sizing diameter to be strictly greater than the current sizing diameter. For FLAT dies, both the new width and new thickness must not be smaller than their current values.
*   **Why**: Re-boring or recutting a die removes internal material, which enlarges the hole (ROUND die diameter) or widens flat sizing boundaries. A smaller size is physically impossible.
*   **Enforced**: Recut Service logic.
*   **Files**: [recut_service.py](file:///home/sahil/Desktop/Projects/dms-o2/backend/dies/services/recut_service.py).
*   **Failure Mode**: Physical dimensions mismatch.
*   **Correct Example**: Recutting a ROUND die from `8.500 mm` to `8.750 mm`.
*   **Incorrect Example**: Recutting a ROUND die from `8.500 mm` to `8.400 mm` (throws a validation error).
*   **Engineering Directive**: Ensure recut dimensions are verified against current values:
    ```python
    if die.die_type == 'ROUND' and new_size <= current_size:
        raise ValidationError("New size must be greater than current size.")
    ```

---

## 4. Sizing Wear Alerts Escalations

### 4.1 Tolerance Deviations Calculations
*   **Rule**: Wear is calculated as `abs(current_size - punched_size)` for ROUND dies, and `max(abs(current_width - punched_width), abs(current_thickness - punched_thickness))` for FLAT dies.
*   **Why**: Determines physical tool wear against configured tolerances.
*   **Enforced**: [wear_alert_service.py](file:///home/sahil/Desktop/Projects/dms-o2/backend/dies/services/wear_alert_service.py).
*   **Failure Mode**: Missing or false alerts.
*   **Escalation Thresholds**:
    *   Wear $\ge$ 70% of max tolerance limit $\rightarrow$ Create or escalate to `WARNING` alert.
    *   Wear $\ge$ 90% of max tolerance limit $\rightarrow$ Create or escalate to `CRITICAL` alert.
    *   Wear $<$ 70% of max tolerance limit $\rightarrow$ Mark alert as `is_resolved=True`.
*   **Engineering Directive**:
    ```python
    wear = abs(current_size - punched_size)
    if wear >= max_wear * Decimal('0.90'):
        # Escalate to CRITICAL
    elif wear >= max_wear * Decimal('0.70'):
        # Escalate to WARNING
    else:
        # Resolve alert
    ```

---

## 5. Wear Prediction & Remaining Lifetime Extrapolations

### 5.1 Timeline Linear Prediction Rule
*   **Rule**: Sizing wear degradation rate is calculated using the first and last measurements in a deduplicated chronological history: `wear_rate = abs(v_last - v0) / days_elapsed` (where `days_elapsed = (t_last - t0).total_seconds() / 86400.0`).
*   **Why**: Extrapolates when a die is expected to wear out based on its historical wear rate.
*   **Enforced**: [wear_prediction_service.py](file:///home/sahil/Desktop/Projects/dms-o2/backend/dies/services/wear_prediction_service.py#L110-L173) (`WearPredictionService._predict_dimension`).
*   **Failure Mode**: Zero division errors on back-to-back sizing updates, or incorrect alerts.
*   **Prediction Thresholds**:
    *   If remaining days < 7 OR wear percentage $\ge$ critical percentage $\rightarrow$ `CRITICAL` alert.
    *   If remaining days < 30 OR wear percentage $\ge$ warning percentage $\rightarrow$ `WARNING` alert.
    *   Otherwise $\rightarrow$ `GOOD` status.
*   **Constraints**: Sizing rate calculations require `days_elapsed > 0.01` to prevent division-by-zero errors.
*   **Engineering Directive**:
    ```python
    days_elapsed = (t_last - t0).total_seconds() / 86400.0
    if days_elapsed > 0.01:
        wear_rate = abs(v_last - v0) / days_elapsed
        if wear_rate > 0:
            remaining_days = max(0.0, tolerance_limit - total_wear) / wear_rate
    ```

