import subprocess
import os

def main():
    project_md_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../PROJECT.md')
    project_md_path = os.path.abspath(project_md_path)
    
    # Read existing content
    if os.path.exists(project_md_path):
        with open(project_md_path, 'r', encoding='utf-8') as f:
            content = f.read()
    else:
        content = ""

    # Find the Changelog section
    changelog_header = "## Changelog"
    if changelog_header in content:
        base_content = content.split(changelog_header)[0] + changelog_header + "\n"
    else:
        base_content = content + "\n\n" + changelog_header + "\n"

    # Get git log
    try:
        # Format: YYYY-MM-DD · commit_msg
        git_log = subprocess.check_output(
            ["git", "log", "--pretty=format:%ad · %s", "--date=short"],
            stderr=subprocess.DEVNULL
        ).decode('utf-8')
        
        entries = []
        for line in git_log.strip().split('\n'):
            if line:
                entries.append(f"### {line}")
        changelog_content = "\n".join(entries) + "\n"
    except Exception:
        # Fallback if git is not initialized or has no commits
        changelog_content = "<!-- No commits yet -->\n"

    new_content = base_content + changelog_content
    with open(project_md_path, 'w', encoding='utf-8') as f:
        f.write(new_content)

if __name__ == '__main__':
    main()
