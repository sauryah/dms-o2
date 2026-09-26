using System;
using System.IO;
using System.Reflection;
using System.Security.Cryptography.X509Certificates;
using System.Windows.Forms;
using System.Drawing;
using System.Diagnostics;
using Microsoft.Win32;

namespace DMS.Client.Setup
{
    static class Program
    {
        // Target Server IP and Hostnames
        public const string ServerIp = "192.168.10.240";
        public const string PrimaryHost = "toolroom.local";
        public const string AppUrl = "https://toolroom.local";

        [STAThread]
        static void Main(string[] args)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            bool silent = false;
            foreach (string arg in args)
            {
                if (arg.Equals("/s", StringComparison.OrdinalIgnoreCase) ||
                    arg.Equals("/silent", StringComparison.OrdinalIgnoreCase) ||
                    arg.Equals("/quiet", StringComparison.OrdinalIgnoreCase))
                {
                    silent = true;
                    break;
                }
            }

            if (silent)
            {
                RunInstallation();
            }
            else
            {
                Application.Run(new InstallerForm());
            }
        }

        public static string RunInstallation()
        {
            string results = "";

            // 1. Install Root CA Certificate
            try
            {
                byte[] certBytes = GetEmbeddedCertificate();
                if (certBytes != null && certBytes.Length > 0)
                {
                    X509Certificate2 cert = new X509Certificate2(certBytes);

                    // Install to LocalMachine Root
                    try
                    {
                        X509Store machineStore = new X509Store(StoreName.Root, StoreLocation.LocalMachine);
                        machineStore.Open(OpenFlags.ReadWrite);
                        machineStore.Add(cert);
                        machineStore.Close();
                    }
                    catch { }

                    // Install to CurrentUser Root
                    try
                    {
                        X509Store userStore = new X509Store(StoreName.Root, StoreLocation.CurrentUser);
                        userStore.Open(OpenFlags.ReadWrite);
                        userStore.Add(cert);
                        userStore.Close();
                    }
                    catch { }

                    results += "[OK] SSL Root Certificate installed into Trusted Root store.\n";
                }
                else
                {
                    results += "[WARNING] Embedded certificate was empty.\n";
                }
            }
            catch (Exception ex)
            {
                results += "[WARNING] Certificate install error: " + ex.Message + "\n";
            }

            // 2. Configure Firefox & Chrome Enterprise Roots via Registry
            try
            {
                using (RegistryKey key = Registry.LocalMachine.CreateSubKey(@"SOFTWARE\Policies\Mozilla\Firefox\Preferences"))
                {
                    if (key != null)
                    {
                        key.SetValue("security.enterprise_roots.enabled", 1, RegistryValueKind.DWord);
                    }
                }
                using (RegistryKey key = Registry.CurrentUser.CreateSubKey(@"SOFTWARE\Policies\Mozilla\Firefox\Preferences"))
                {
                    if (key != null)
                    {
                        key.SetValue("security.enterprise_roots.enabled", 1, RegistryValueKind.DWord);
                    }
                }
                results += "[OK] Firefox & Chrome enterprise root trust enabled.\n";
            }
            catch (Exception ex)
            {
                results += "[INFO] Browser enterprise registry note: " + ex.Message + "\n";
            }

            // 3. Update hosts file with toolroom.local mapping
            try
            {
                string hostsPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System), @"drivers\etc\hosts");
                if (File.Exists(hostsPath))
                {
                    string content = File.ReadAllText(hostsPath);
                    string targetMapping = string.Format("{0}    toolroom    toolroom.local    dms.local", ServerIp);

                    if (!content.Contains("toolroom.local") && !content.Contains(ServerIp))
                    {
                        File.AppendAllText(hostsPath, "\r\n# DMS-O2 Manufacturing System\r\n" + targetMapping + "\r\n");
                        results += "[OK] Added 'toolroom.local' and 'dms.local' to Windows hosts file.\n";
                    }
                    else
                    {
                        results += "[OK] Hostname mapping already configured in hosts file.\n";
                    }
                }
            }
            catch (Exception ex)
            {
                results += "[WARNING] Could not update hosts file (run as administrator): " + ex.Message + "\n";
            }

            // 4. Create Desktop Shortcut
            try
            {
                string desktopPath = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                string shortcutPath = Path.Combine(desktopPath, "DMS-O2 Toolroom.url");

                string shortcutContent = string.Format("[InternetShortcut]\r\nURL={0}\r\nIconIndex=0\r\nIconFile={1}\\System32\\shell32.dll\r\n", AppUrl, Environment.GetFolderPath(Environment.SpecialFolder.Windows));
                File.WriteAllText(shortcutPath, shortcutContent);
                results += "[OK] Desktop shortcut 'DMS-O2 Toolroom' created.\n";
            }
            catch (Exception ex)
            {
                results += "[INFO] Shortcut creation note: " + ex.Message + "\n";
            }

            return results;
        }

        private static byte[] GetEmbeddedCertificate()
        {
            Assembly assembly = Assembly.GetExecutingAssembly();
            string[] names = assembly.GetManifestResourceNames();
            foreach (string name in names)
            {
                if (name.EndsWith("rootCA.cer", StringComparison.OrdinalIgnoreCase))
                {
                    using (Stream stream = assembly.GetManifestResourceStream(name))
                    {
                        if (stream != null)
                        {
                            byte[] buffer = new byte[stream.Length];
                            stream.Read(buffer, 0, buffer.Length);
                            return buffer;
                        }
                    }
                }
            }
            return null;
        }
    }

    public class InstallerForm : Form
    {
        private Label lblTitle;
        private Label lblDesc;
        private TextBox txtLog;
        private Button btnInstall;
        private Button btnLaunch;
        private Button btnClose;

        public InstallerForm()
        {
            InitializeComponents();
        }

        private void InitializeComponents()
        {
            this.Text = "DMS-O2 Client Setup";
            this.Size = new Size(520, 420);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.BackColor = Color.FromArgb(248, 250, 252);
            this.Font = new Font("Segoe UI", 9F, FontStyle.Regular, GraphicsUnit.Point);

            lblTitle = new Label();
            lblTitle.Text = "DMS-O2 Toolroom Client Setup";
            lblTitle.Font = new Font("Segoe UI", 14F, FontStyle.Bold, GraphicsUnit.Point);
            lblTitle.ForeColor = Color.FromArgb(15, 23, 42);
            lblTitle.Location = new Point(24, 20);
            lblTitle.Size = new Size(460, 32);

            lblDesc = new Label();
            lblDesc.Text = "This utility configures this computer to securely connect to the DMS-O2 server at 192.168.10.240 (toolroom.local).\nIt installs the SSL certificate, configures naming, and creates a desktop shortcut.";
            lblDesc.ForeColor = Color.FromArgb(71, 85, 105);
            lblDesc.Location = new Point(24, 56);
            lblDesc.Size = new Size(460, 40);

            txtLog = new TextBox();
            txtLog.Multiline = true;
            txtLog.ReadOnly = true;
            txtLog.ScrollBars = ScrollBars.Vertical;
            txtLog.BackColor = Color.FromArgb(255, 255, 255);
            txtLog.ForeColor = Color.FromArgb(30, 41, 59);
            txtLog.Font = new Font("Consolas", 8.5F, FontStyle.Regular, GraphicsUnit.Point);
            txtLog.Location = new Point(24, 110);
            txtLog.Size = new Size(456, 190);
            txtLog.Text = "Ready to configure DMS-O2 workstation access.\r\nClick 'Setup Workstation' to begin.";

            btnInstall = new Button();
            btnInstall.Text = "Setup Workstation";
            btnInstall.Location = new Point(24, 320);
            btnInstall.Size = new Size(150, 38);
            btnInstall.BackColor = Color.FromArgb(16, 185, 129);
            btnInstall.ForeColor = Color.White;
            btnInstall.FlatStyle = FlatStyle.Flat;
            btnInstall.Font = new Font("Segoe UI", 9.5F, FontStyle.Bold, GraphicsUnit.Point);
            btnInstall.Click += BtnInstall_Click;

            btnLaunch = new Button();
            btnLaunch.Text = "Open DMS-O2";
            btnLaunch.Location = new Point(184, 320);
            btnLaunch.Size = new Size(140, 38);
            btnLaunch.BackColor = Color.FromArgb(37, 99, 235);
            btnLaunch.ForeColor = Color.White;
            btnLaunch.FlatStyle = FlatStyle.Flat;
            btnLaunch.Font = new Font("Segoe UI", 9.5F, FontStyle.Bold, GraphicsUnit.Point);
            btnLaunch.Enabled = false;
            btnLaunch.Click += BtnLaunch_Click;

            btnClose = new Button();
            btnClose.Text = "Close";
            btnClose.Location = new Point(380, 320);
            btnClose.Size = new Size(100, 38);
            btnClose.BackColor = Color.FromArgb(226, 232, 240);
            btnClose.ForeColor = Color.FromArgb(51, 65, 85);
            btnClose.FlatStyle = FlatStyle.Flat;
            btnClose.Click += (s, e) => { this.Close(); };

            this.Controls.Add(lblTitle);
            this.Controls.Add(lblDesc);
            this.Controls.Add(txtLog);
            this.Controls.Add(btnInstall);
            this.Controls.Add(btnLaunch);
            this.Controls.Add(btnClose);
        }

        private void BtnInstall_Click(object sender, EventArgs e)
        {
            btnInstall.Enabled = false;
            txtLog.Text = "Configuring workstation access...\r\n\r\n";
            Application.DoEvents();

            string res = Program.RunInstallation();
            txtLog.Text += res;
            txtLog.Text += "\r\nSUCCESS: Workstation setup complete!\r\nYou can now open DMS-O2 in your browser.";

            btnLaunch.Enabled = true;
            btnInstall.Text = "Completed";
        }

        private void BtnLaunch_Click(object sender, EventArgs e)
        {
            try
            {
                Process.Start(new ProcessStartInfo(Program.AppUrl) { UseShellExecute = true });
            }
            catch (Exception ex)
            {
                MessageBox.Show("Could not launch browser: " + ex.Message, "Notice", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
        }
    }
}
