#!/bin/bash
if [ -n "$GITHUB_SSH_KEY" ]; then
  mkdir -p ~/.ssh
  chmod 700 ~/.ssh
  echo "$GITHUB_SSH_KEY" | base64 -d > ~/.ssh/github_key
  chmod 600 ~/.ssh/github_key
  cat > ~/.ssh/config << SSHEOF
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/github_key
  StrictHostKeyChecking no
SSHEOF
  chmod 600 ~/.ssh/config
  echo "Git SSH configured successfully"
else
  echo "Warning: GITHUB_SSH_KEY secret not found"
fi
