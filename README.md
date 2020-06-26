# fargate-jwt-verifier

same codebase for versions 1 and 2

for version 1 of this 'verifier', set: const appVersion = "1"; (line 14 main.js) and make a docker image with a tag and deploy it.

for version 2 "verifier2", set: const appVersion = "2"; and make a docker image with a different tag and deploy it.

the only difference between the two is the returned data: version 1 is more verbose than version 2.
