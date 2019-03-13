workflow "Build, lint and test" {
  on = "push"
  resolves = [
    "Build project",
    "Lint project",
    "Test project",
    "Publish project"
  ]
}

action "Don't skip CI" {
  uses = "ffflorian/actions/last_commit@master"
  args = "^(?:(?!\\[(ci skip|skip ci)\\]).)*$"
}

action "Install dependencies" {
  uses = "ffflorian/actions/git-node@master"
  needs = "Don't skip CI"
  runs = "yarn"
}

action "Lint project" {
  uses = "ffflorian/actions/git-node@master"
  needs = "Install dependencies"
  runs = "yarn"
  args = "lint"
}

action "Build project" {
  uses = "ffflorian/actions/git-node@master"
  needs = "Install dependencies"
  runs = "yarn"
  args = "dist"
}

action "Test project" {
  uses = "ffflorian/actions/git-node@master"
  needs = "Install dependencies"
  runs = "yarn"
  args = "test"
}

action "Check for master branch" {
  uses = "actions/bin/filter@master"
  needs = [
    "Build project",
    "Lint project",
    "Test project"
  ]
  args = "branch master"
}

action "Don't publish dependency updates" {
  uses = "ffflorian/actions/last_commit@master"
  needs = "Check for master branch"
  args = "^(?!chore\\(deps)"
}

action "Publish project" {
  uses = "ffflorian/actions/git-node@master"
  needs = "Don't publish dependency updates"
  env = {
    GIT_AUTHOR_NAME = "ffflobot"
    GIT_AUTHOR_EMAIL = "ffflobot@users.noreply.github.com"
    GIT_COMMITTER_NAME = "ffflobot"
    GIT_COMMITTER_EMAIL = "ffflobot@users.noreply.github.com"
  }
  runs = "yarn"
  args = "release"
  secrets = ["GH_TOKEN", "NPM_TOKEN"]
}
