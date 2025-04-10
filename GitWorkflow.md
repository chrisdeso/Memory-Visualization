Memory Visualization Project - CS3339 Spring 2025
llaboration, and ensure code quality.

🌳 Branch Structure
Our repository uses a structured branching model:

__main__ - Production-ready code

Contains only stable, tested, and reviewed code
Protected branch (no direct pushes)
Only updated through pull requests from develop
Tagged for releases


__develop__ - Integration branch

Contains latest development work that passes tests
Protected branch (no direct pushes)
Base for feature branches
Periodically merged into main at milestones


__Feature branches__: feature/<feature-name>

Created from develop
Used for developing new features
Merged back into develop when complete
Example: feature/stack-visualization


__Bug fix branches__: bugfix/<bug-description>

Created from develop
Used for fixing bugs found anywhere in the codebase
Merged back into develop when complete
Example: bugfix/stack-overflow


🔄 Development Workflow
Follow these steps for the standard development workflow:

1. Create a Feature Branch

```bash
# Make sure your local develop branch is up to date
git checkout develop
git pull origin develop

# Create a new feature branch
git checkout -b feature/your-feature-name
```

2. Work on Your Feature
```bash
# Make changes to code
# Stage your changes
git add .

# Commit your changes with a descriptive message
git commit -m "Add memory block visualization component"

# Push your branch to remote repository
git push -u origin feature/your-feature-name
```

3. Stay Updated with develop
Regularly sync your branch with the latest changes from develop:

```bash
# Get latest changes from develop
git checkout develop
git pull origin develop

# Switch back to your feature branch
git checkout feature/your-feature-name

# Merge develop into your feature branch
git merge develop

# Resolve any conflicts if necessary
# Push updated branch
git push origin feature/your-feature-name
```

4. Create a Pull Request
When your feature is complete:

    1. Push your final changes to your feature branch
    2. Go to GitHub and create a Pull Request from your feature branch to develop
    3. Fill in the PR template with details about your changes
    4. Request reviews from team members
    5. Address any feedback or comments

    ```bash
    # Ensure you're starting from an updated main/develop branch
    git checkout develop
    git pull origin develop

    # Create your feature branch
    git checkout -b feature/your-feature-name

    # Make your changes and commit them
    git add .
    git commit -m "Implement memory visualization component"

    # Push your branch to GitHub
    git push -u origin feature/your-feature-name
    ```
    Then create the PR using GitHub's web interface

    1. Go to your repository on GitHub
    2. You'll likely see a prompt to "Compare & pull request" for your recently pushed branch
    3. If not, click on "Pull requests" tab, then "New pull request"
    4. Select your branch as the "compare" branch and the target branch (e.g., develop) as the "base" branch
    5. Fill in the PR title and description
    6. Click "Create pull request"

    OR use the github CLI / Git Kraken / Guthub app

5. Merge the Pull Request
Once approved (by __at least one__ other member of the project)

    1. The PR will be merged into develop
    2. Delete the feature branch after successful merge

📝 Commit Guidelines
Write clear, descriptive commit messages:

    - Start with a verb in present tense (Add, Fix, Update, Refactor)
    - Keep the first line under 50 characters
    - Add detailed description in the body if needed
    - Reference issue numbers when applicable (e.g., "Fixes #42")

🚫 Common Things to Avoid

    - Never commit directly to main or develop
    - Never force push to shared branches
    - Never commit large binary files or build artifacts
    - Never commit sensitive information (tokens, passwords)
    - Never commit with vague messages like "Fixed stuff"
