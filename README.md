# Autonomous Mining Equipment Market Map

## Group Members

| Student ID | Name         |
| ---------- | ------------ |
| 24661999   | Hans Lionar  |
| 24389925   | Zerun Zhang  |
| 24814799   | Tyrone Tran  |
| 24758673   | Zunhao Zhang |
| 24368932   | Shee Wang    |
| 24201874   | Hengan Weng  |

## Description

Western Australia is a global leader in the adoption of autonomous mining technologies. However, there is no centralized, publicly accessible, and verifiable repository tracking autonomous mining equipment globally. This project is to build a web-based, crowdsourced, and queryable geospatial database designed to catalog every autonomous mining machine ever deployed. The objective of this project is to develop a robust Full-Stack Web Application that provides: A queryable database of global autonomous mining assets. A verified crowdsourcing mechanism allowing industry professionals to submit new kit data. An interactive GIS Map layer demonstrating geographical asset distribution. A Data Analytics Dashboard visualizing automation adoption trends across the industry. Example of data to include: Equipment Instance: Specific machine information including Type (Truck, Dozer, Loader, Drill), Manufacturer (CAT, Komatsu, Liebherr), Model, and machine-specific metadata (e.g., Max Payload, Operating Weight). Technology & Timeline: Tracking the technology provider/integrator (e.g., RCT, ASI, CAT) and the specific deployment/commissioning date. Geographic Grouping (Mine Sites): Equipment must support multi-layered grouping (e.g., individual autonomous trucks grouped under "Mine Site X", which is grouped under "Pilbara Region Operations", owned by "Company Y"). Verification Layer: To prevent misinformation, equipment must link to evidence (e.g., a URL to a press release, news story, or academic paper) to gain a 'verification' mark. Case Studies & Media: Allow users to upload or link case studies and cross-reference them with specific companies, sites, or equipment types. Technology stack is entirely up to the team to choose, but should support being deployed in a UWA IT environment as far as practical.

- **IP**: Creative Commons (open source)
- **Client**: Adrian Boeing
- **Location**: UWA EECE

## Local development

Follow the steps in order. Every command is typed into a terminal
(macOS: **Terminal**; Windows: **PowerShell**; Linux: your usual terminal).

### 1. Install the requirements

You need four things. Install each one once. After installing anything, **close
the terminal and open a new one**, so that it finds the new commands.

On Windows 10/11 you can install all of them from PowerShell with `winget`,
which is built in. Accept the administrator prompts that appear:

```powershell
winget install --id Git.Git -e
winget install --id GitHub.cli -e
winget install --id OpenJS.NodeJS.22 -e
winget install --id Docker.DockerDesktop -e
```

Then continue with the sign-in in step 1b and the Docker set-up in step 1c.

**a. Git**, to download the code

- macOS: run `xcode-select --install`, or download from <https://git-scm.com/downloads>
- Windows: download from <https://git-scm.com/downloads>
- Ubuntu/Debian: `sudo apt install git`

Check: `git --version` prints a version number.

**b. Access to this repository**

The repository is private, so your GitHub account must be a collaborator and
you must be signed in to GitHub on your computer. The steps below use the
[GitHub CLI](https://cli.github.com/); a
[personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)
also works.

1. Send your GitHub username to a repository owner. They add it under the
   repository's **Settings → Collaborators → Add people**.
2. Accept the invitation from the email GitHub sends you, or at
   <https://github.com/zinken7/capstone-group-5/invitations>.
3. Install the GitHub CLI (macOS: download the installer from
   <https://cli.github.com/>, or run `brew install gh` if you use Homebrew;
   Windows: see the `winget` commands above; Linux: see
   <https://github.com/cli/cli#installation>), then run:

   ```sh
   gh auth login
   ```

   Answer **GitHub.com**, **HTTPS**, **Yes** (authenticate Git with your
   GitHub credentials) and **Login with a web browser**. The terminal shows an
   eight-character code; enter it at <https://github.com/login/device> and
   select **Authorize**.

Check: `gh repo view zinken7/capstone-group-5` prints the repository
description instead of an error.

**c. Docker**

- macOS / Windows: install [Docker Desktop](https://docs.docker.com/desktop/),
  then **open the Docker Desktop app** and leave it running in the background.
  - On Apple Silicon Macs, the official PostGIS image needs `linux/amd64`
    emulation. In Docker Desktop, open **Settings → General** and make sure
    **Use Rosetta for x86_64/amd64 emulation on Apple Silicon** is ticked
    (it is on by default in recent versions).
  - On Windows, Docker Desktop needs the Windows Subsystem for Linux (WSL 2).
    If `wsl --status` says that WSL is not installed, open PowerShell **as
    administrator** (right-click **Windows PowerShell** → **Run as
    administrator**), run `wsl --install`, and restart the computer. Then open
    Docker Desktop, accept its licence agreement, and wait until it shows
    **Engine running**.
- Linux: install [Docker Engine](https://docs.docker.com/engine/install/) with
  the Compose plugin, then complete the
  [post-install steps](https://docs.docker.com/engine/install/linux-postinstall/)
  so that you can run Docker without `sudo`:

  ```sh
  sudo usermod -aG docker $USER
  ```

  Log out and log back in (or restart) afterwards.

Check: `docker ps` prints a table header and no error.

**d. Node.js 22 (includes npm)**, for the frontend

The project requires **Node.js 22.13 or later, but not 23 or later**. The
newest version offered on nodejs.org is usually *not* 22, so pick it
explicitly. The easiest way on macOS and Linux is [nvm](https://github.com/nvm-sh/nvm).

On macOS only, first create the shell settings file that nvm adds itself to
(a new Mac does not have one):

```sh
touch ~/.zshrc
```

Then, on macOS and Linux:

```sh
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.8/install.sh | bash
```

**Close the terminal and open a new one**, then:

```sh
nvm install 22
```

On Windows, download the **v22** installer from <https://nodejs.org/en/download>,
or use `winget install --id OpenJS.NodeJS.22 -e`.

Check: `node -v` prints `v22.x.x`, and `npm -v` prints a version number.

### 2. Download the code

```sh
git clone https://github.com/zinken7/capstone-group-5.git
cd capstone-group-5
```

All commands in the next step are run **inside the `capstone-group-5` folder**.

### 3. Start the backend and database

Copy the example settings file. This command and the health check below are
the only ones in this step that differ between systems.

macOS / Linux:

```sh
cp .env.example .env
```

Windows (PowerShell):

```powershell
Copy-Item .env.example .env
```

Then, on every system, start the stack, create the tables and load the
demonstration data:

```sh
docker compose up --build -d
docker compose exec backend npm run db:migrate
docker compose cp backend/seeds/seed_global.sql db:/tmp/seed_global.sql
docker compose exec db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -X -v ON_ERROR_STOP=1 -f /tmp/seed_global.sql'
```

The first run downloads images and can take several minutes. The migration
command upgrades both fresh and existing databases. The seed command loads the
deterministic synthetic demonstration dataset and is safe to repeat. After the
first image build, `docker compose up -d` is sufficient. The seed is copied
into the database container first so that the same commands work in every
shell, including PowerShell, and `ON_ERROR_STOP=1` makes a failed seed stop
with an error instead of looking successful.
The services are available at:

- Backend API: `http://localhost:3000`
- PostgreSQL/PostGIS: `localhost:5432`

Confirm that the backend can reach PostgreSQL and that PostGIS is enabled.

macOS / Linux:

```sh
curl --fail http://localhost:3000/health/database
```

Windows (PowerShell; `curl` on its own is a different command there):

```powershell
curl.exe --fail http://localhost:3000/health/database
```

On any system you can also open <http://localhost:3000/health/database> in a
browser.

A working setup returns `"status":"ok"` together with the PostgreSQL and
PostGIS versions. Stop the stack with `docker compose down`. The named database
volume is retained between starts; `docker compose down --volumes` also deletes
all local database data.

### 4. Start the frontend

Open a **second terminal** and run the commands for your system. Use the path
to wherever you cloned the repository.

macOS / Linux:

```sh
cd capstone-group-5/frontend
npm ci
cp .env.example .env
npm run dev
```

Windows (PowerShell):

```powershell
cd capstone-group-5\frontend
npm ci
Copy-Item .env.example .env
npm run dev
```

`npm ci` may finish with messages about vulnerabilities or a newer npm
version. These are not errors and can be ignored. Do **not** run
`npm audit fix` or upgrade npm, because that changes the project's locked
dependencies.

Vite prints the local URL, normally `http://localhost:5173`. Open it in your
browser: the map page should show the demonstration mine sites. The checked-in
frontend environment example sends `/api` requests to the backend at
`http://localhost:3000` through the development proxy.

Keep this terminal open while you use the site; press `Ctrl+C` to stop it.

### 5. (Optional) Create an administrator account

The review queue, approvals and corrections are only available to signed-in
administrators. To try them, create an account from the project folder. The
command is the same on every system:

```sh
docker compose exec backend npm run admin:create -- --email you@example.com --root
```

The command prints a temporary password once. Sign in at
<http://localhost:5173/admin> and set a new password when asked. This works
with the default `SESSION_SECRET` copied from `.env.example`.

### Starting again later

Steps 1 to 5 are only needed once. Next time, make sure Docker Desktop is
running, then, inside the `capstone-group-5` folder:

```sh
docker compose up -d
```

and, in a second terminal inside `frontend`:

```sh
npm run dev
```

After pulling new changes, run `docker compose up --build -d`,
`docker compose exec backend npm run db:migrate` and, inside `frontend`,
`npm ci`, so that the image, database schema and dependencies match the code.

To stop, press `Ctrl+C` in the frontend terminal and run `docker compose down`.

### Troubleshooting

| What you see | Cause and fix |
|---|---|
| `cp: cannot stat '.env.example': No such file or directory`, or in PowerShell `Cannot find path '...\.env.example'` | You are not in the project folder. Run `cd capstone-group-5` (step 2) first. |
| `git clone` asks for a username, or GitHub shows 404 | You don't have access yet, or you are not signed in. See step 1b. |
| `permission denied while trying to connect to the docker API` | Linux only: complete the Docker post-install steps in step 1c, then log out and back in. |
| `Cannot connect to the Docker daemon`, or on Windows `failed to connect to the docker API at npipe:////./pipe/docker_engine` | Docker Desktop is not running. Open the app and wait until it shows that it is running. On Windows, if it does not start, install WSL as described in step 1c. |
| Windows: `The term 'git' (or 'node', 'npm', 'gh', 'docker') is not recognized` | The program is not installed, or the terminal was opened before it was installed. Install it (step 1), then close the terminal and open a new one. |
| `port is already allocated` or `ports are not available` for 5432 or 3000 | Another program, often a local PostgreSQL, is using the port. Stop it, or set another `POSTGRES_PORT` or `BACKEND_PORT` in `.env`. If you change `BACKEND_PORT`, also change `API_PROXY_TARGET` in `frontend/.env`. |
| `A parameter cannot be found that matches parameter name 'fail'` | Windows PowerShell: use `curl.exe` instead of `curl`, or open the URL in a browser. |
| `nvm: command not found` after installing nvm | macOS: run `touch ~/.zshrc`, run the nvm install command again, then close the terminal and open a new one. Linux: close the terminal and open a new one. |
| `npm: command not found` | Node.js is not installed. See step 1d. |
| `EBADENGINE` / `Unsupported engine` | Wrong Node.js version. Run `nvm install 22` (or install v22), then `node -v` to check. |

### Environment variables

Copy [`.env.example`](.env.example) to `.env` before starting the stack. The
example values are for local development only; `.env` is ignored by Git and
must never be committed.

| Variable | Purpose |
|---|---|
| `POSTGRES_DB` | Local database name |
| `POSTGRES_USER` | Local database user |
| `POSTGRES_PASSWORD` | Local-only database password |
| `POSTGRES_PORT` | Database port exposed on the host |
| `BACKEND_PORT` | Backend port exposed on the host |
| `DATABASE_URL` | Backend connection string when running outside Compose |
| `SESSION_SECRET` | Signs administrator session cookies; at least 32 characters |
| `TEST_DATABASE_URL` | Optional; database for the backend test suite (defaults to `DATABASE_URL` + `_test`) |
| `POSTGIS_PLATFORM` | Docker image platform; defaults to `linux/amd64` |

Inside Docker Compose, the backend connection string is overridden to use
`db`—the Compose database service name—as its host. This keeps the checked-in
example useful for running the backend directly while preserving container
networking.

The frontend has its own [`frontend/.env.example`](frontend/.env.example):

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Browser-visible API base URL (`/api`); never put secrets in `VITE_*` variables |
| `API_PROXY_TARGET` | Where the Vite development proxy forwards `/api` requests (`http://localhost:3000`) |

## Staging

The integrated build runs at <https://capstone-group-5.vercel.app>, with the
API at <https://capstone-group-5-api.vercel.app>. See
[`docs/staging.md`](docs/staging.md) for its architecture, environment
variables, deployment, migrations and rollback.

## Licence

- **Source code:** MIT, see [`LICENSE`](LICENSE).
- **Dataset:** the verified records published by the application, through the
  pages, the public API and the CSV export, are licensed under
  [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). See
  [`LICENSE-DATA.md`](LICENSE-DATA.md) for the credit line. Evidence and media
  linked from records keep their own copyright.

The brief sets the project's IP as Creative Commons (open source). Creative
Commons licences are not designed for software, so the code uses MIT and the
data uses CC BY 4.0, as proposed in SRS Q-10 (NFR-08, NFR-10).
