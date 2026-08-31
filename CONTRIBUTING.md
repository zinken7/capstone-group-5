# Contributing

Working conventions for Group 5. Items marked ⟨confirm⟩ are proposals awaiting
team agreement.

## Getting started

*Commands are filled in during Sprint 1, once the stack is running.*

**Prerequisites:** ⟨Docker and Docker Compose; runtime and version⟩

```bash
# 1. Clone
git clone https://github.com/zinken7/capstone-group-5.git
cd capstone-group-5

# 2. Configure: copy the example environment file and fill in the values
cp .env.example .env

# 3. Start the database and application
⟨docker compose up -d⟩

# 4. Apply database migrations
⟨migration command⟩

# 5. Load the seed dataset
⟨seed command⟩

# 6. Run the tests
⟨test command⟩
```

The application is then available at ⟨http://localhost:PORT⟩.

## The short version

An issue, a branch, a pull request and a commit all refer to the same unit of
work, identified by the issue number.

```
issue #14
  └── branch  feat/14-map-markers
        └── commits  feat(map): render site markers from the GeoJSON endpoint
              └── pull request  "Closes #14"  →  squash merge  →  card moves to Done
```

## Branching

`main` is protected: it is always deployable and is never committed to
directly. All work happens on a short-lived branch, one per issue.

```
<type>/<issue-number>-<short-name>
```

Examples:

```
feat/14-map-markers
fix/22-marker-popup-drag
docs/31-deployment-guide
```

Delete the branch after merging. If a branch has been open for more than about
two days, it is too large: split the issue.

## Commits

Commit messages follow [Conventional
Commits](https://www.conventionalcommits.org/en/v1.0.0/):

```
<type>(<scope>): <description>
```

**Types.** Use only these:

| Type | For |
|---|---|
| `feat` | New capability |
| `fix` | Corrects broken behaviour |
| `docs` | Documentation only |
| `refactor` | Restructuring with no behaviour change |
| `test` | Adding or changing tests |
| `chore` | Dependencies, configuration, tidying |

**Scopes.** Use only these. Each maps to a feature in
[`docs/project_plan.md`](docs/project_plan.md), so a commit, an issue and the
plan all name the same thing.

| Scope | Feature | Covers |
|---|---|---|
| `map` | F1 Map | Map view, markers, layers, filters, site detail |
| `register` | F2 Equipment register and export | Register list, search, sorting, record detail, export |
| `analytics` | F3 Analytics | Headline statistics, growth and share charts |
| `contribute` | F4 Contribute and verification | Submission form, evidence, verification states, administration screen |
| `platform` | F0 Foundation, F5 Deployment | Schema, migrations, API plumbing, CI/CD, environments, deployment |
| `docs` | none | Report, project plan, guides |

**Style.** Imperative mood, lower case after the colon, no full stop, subject
under about 70 characters. The subject should complete the sentence "this
commit will …".

```
feat(map): colour markers by deployment status
fix(analytics): correct percentage automated calculation
docs(platform): document required environment variables
test(register): add filter query tests
```

Not acceptable: `update`, `fix stuff`, `asdf`, `final version 2`.

## Issues

One issue per unit of work, roughly two days or less. Every issue carries an
**assignee**, a **milestone** (the sprint it belongs to) and one **label**.

Body template:

```markdown
**What is needed**
One or two sentences.

**Done when**
- [ ] Acceptance criterion
- [ ] Acceptance criterion

**Depends on**
#n, or none.
```

Labels use the same names as the commit scopes above, plus `bug` and
`blocked`. Priority is the milestone and status is the board, so neither needs
a label.

## Pull requests

1. Open the pull request against `main`.
2. Title follows the commit convention. It becomes the commit subject on
   squash merge, so this is the message that lands in history.
3. Body includes `Closes #n`, what changed, and how it was tested. GitHub
   pre-fills this from
   [`.github/pull_request_template.md`](.github/pull_request_template.md).
4. One approving review is required, from someone outside your own area.
5. CI must pass. Branch protection enforces both.
6. Squash merge, then delete the branch.

Review is for catching problems early, not for scoring points. Be direct about
defects and open to being wrong.

## Definition of done

A task is done when:

- the change is merged to `main`;
- CI has passed;
- it is running on staging;
- the acceptance criteria in the issue are demonstrably met;
- affected documentation was updated in the same pull request.

## Board

Tasks are tracked on the GitHub Projects board. Status is maintained by
automation: issues close when their pull request merges, which moves the card
to Done. Do not move cards by hand except to mark work as started.

## When you are stuck

Raise it in the team channel the same day. Anything blocked for more than two
working days is escalated to the client or facilitator rather than absorbed.
Label the issue `blocked` and pick up the next item on the board rather than
waiting.
