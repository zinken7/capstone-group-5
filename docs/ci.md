# Continuous integration

`.github/workflows/lint.yml` runs on every pull request and on pushes to `main`.
PRs select jobs by changed paths; pushes to `main` run the full suite. There are
no workflow-level path filters, so required checks are always reported.

## Path selection

| Changed paths in a PR | Selected checks |
| --- | --- |
| `frontend/**` | Frontend lint, typecheck, tests and production build |
| `backend/**`, including migrations, seed data and database configuration | Backend lint, typecheck, build, migrations and all tests with PostGIS |
| `services/**` | Checks declared by the service implementation |
| `infra/**` | Terraform formatting/validation and any declared infrastructure checks |
| Application/service `Dockerfile*` or `.dockerignore` | Owning area plus Docker Compose configuration validation |
| Root `docker-compose*.yml/yaml`, `compose*.yml/yaml`, `.env*`, `Dockerfile*`, `.dockerignore` | All areas, including Docker Compose validation |
| Root `package.json`, `package-lock.json`, `.npmrc`, `.nvmrc`, `.node-version` | All areas |
| `.github/workflows/**` or `.github/scripts/ci/**` | All areas, to exercise the CI change itself |
| Documentation only (`docs/**`, root documentation, or `.md`/`.mdx`/`.rst` within areas) | Routing tests and required result gate; no application/database jobs |

Multiple areas select the union of their checks. Unowned paths such as the
archived `prototype/` do not start application jobs. Add explicit routing when
introducing a new shared runtime/toolchain dependency; do not assume an unknown
root file automatically affects every application.

Detection uses the PR base/head commit SHAs and a three-dot Git diff against
their merge base. Full checkout history avoids shallow-history errors. Renames
are treated as deletion plus addition, so moves across areas test both sides.
The local Git diff has no GitHub changed-file API pagination or 300-file filter
limit. Missing commits or detection errors fail CI instead of skipping checks.

## Backend database coverage

Backend checks use an isolated `postgis/postgis:17-3.5` service, matching the
root Compose image. Its `test` credentials are disposable CI values, not
deployment credentials. After the health check, CI runs `npm ci`, lint,
typecheck, build, `npm run db:migrate`, then `npm test` with `NODE_ENV=test` and
`DATABASE_URL` pointing to that service.

All backend changes currently run this one complete test suite. There is no
unit/database test split in the repository, so CI does not infer dependencies
from individual source filenames. This deliberately includes migrations,
seed data, configuration and dependency changes. Frontend-, service-, infra-
and documentation-only PRs do not start PostGIS.

This workflow is independent of PR #54. On current `main`, it applies existing
migrations and runs the existing backend tests. Once #54 merges, its colocated
database tests will be picked up by the same `npm test` command. CI does not
copy seed code from that branch or run production reference seeding.

## Services and infrastructure

Both directories currently contain only README files. CI reports this
explicitly; it does not claim that service tests or Terraform validation ran.

When introducing a service, add `services/ci.sh` in the same PR. This entry
point runs from the repository root and must install the actual service's
dependencies and run its lint, typecheck and tests, returning nonzero on
failure. Add necessary language setup to the service job in `lint.yml` then.
If there are multiple services, this script owns their checks. Code without
this entry point fails CI; no Node/Python stack is guessed for future services.

When tracked `infra/**/*.tf` or `*.tf.json` files exist, CI installs Terraform,
runs `terraform fmt -check -recursive infra`, and runs
`terraform init -backend=false -input=false` followed by `terraform validate`
in each directory containing Terraform configuration, including local modules.
No plan/apply or deployment credentials are used. The setup action currently
uses its default Terraform release; pin the project's version when adding the
first real Terraform configuration. See the
[Terraform validation reference](https://developer.hashicorp.com/terraform/cli/commands/validate).

Other infrastructure checks can be declared in `infra/ci.sh`, also invoked from
the repository root. Non-Terraform implementation without that entry point
fails CI. If Terraform and other tooling coexist, declare the extra checks in
the entry point alongside the built-in Terraform validation.

## Required checks

The existing ruleset requires `Backend Lint`, `Frontend Lint` and
`Validate branch and PR title`. Their names are retained; no ruleset change is
needed for this PR.

`Frontend Lint` runs only when selected. `Backend Lint` is now the lightweight,
always-running result gate, while the actual backend work is named
`Backend checks and database tests`. The legacy gate name is kept for ruleset
compatibility. It depends on detection and **all** area jobs, and fails if:

- detection fails, is cancelled, or lacks an area selection;
- any selected job fails, is cancelled, or is unexpectedly skipped;
- any unselected job reports an unexpected result.

Thus services, infrastructure and Compose failures also block the existing
required gate. A docs-only PR passes when detection succeeds and every area
job is intentionally skipped. Merely skipping a required workflow would leave
a pending check; skipping jobs within a running workflow is supported by
[GitHub's required-check behavior](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/troubleshooting-required-status-checks#handling-skipped-but-required-checks).

## Local validation

From the repository root:

```sh
node --test .github/scripts/ci/*.test.mjs
bash -n .github/scripts/ci/services.sh .github/scripts/ci/infra.sh
docker compose --env-file .env.example config --quiet
actionlint .github/workflows/lint.yml .github/workflows/pr-conventions.yml
git diff --check
```

Routing tests cover separate/multiple areas, migrations, seeds, docs-only
changes, runtime/workflow changes, renames and full-suite pushes. Gate tests
cover failure/cancellation/unexpected skips. Area-runner tests check missing
configuration, declared commands, Terraform invocation and failure propagation;
they mock the Terraform binary and do not provision infrastructure.
