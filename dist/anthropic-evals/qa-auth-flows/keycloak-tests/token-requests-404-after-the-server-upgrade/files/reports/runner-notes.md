# What our CI runners are

| | |
|---|---|
| Pool | GitHub-hosted `ubuntu-latest` |
| Lifetime | a fresh VM per job, destroyed after |
| What is on it before our steps run | the image's preinstalled software and nothing else |
| Docker | preinstalled and running |
| Anything of ours left over between jobs | nothing; there is no cache and no persistent volume |

@tobrien asked whether the runners could be leaving something behind between
jobs. They cannot — every job gets a new machine.
