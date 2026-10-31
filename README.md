# Ride Plans

Zwift training plans and session logs for Scott and Emma, hosted on GitHub Pages and synced through Supabase.

- **Scott: Spring Group-Ride Build.** 20 weeks from 2 Nov 2026 to a faster club group ride in March, alongside a Mon/Wed/Fri kettlebell week.
- **Emma: Nap-Time Rides.** 12 weeks from 2 Nov 2026 with two short rides a week (Mon/Thu) around yoga and boxing. Each ride is a 20–35 minute core you can extend if the nap runs long.

Each person signs in with their email and password, and only sees their own plan and logs.

## Setup (about 15 minutes, once)

### 1. Create the Supabase project
1. Sign up at [supabase.com](https://supabase.com) and create a new project (the free tier is plenty). Pick the London region. Under **Security**, keep **Enable Data API** on, switch **Automatically expose new tables** off, and switch **Enable automatic RLS** on. The schema script grants access to just the two tables this site uses.
2. Open **SQL Editor → New query**, paste the contents of [`supabase/schema.sql`](supabase/schema.sql) and click **Run**. This creates the `profiles` and `logs` tables, with row-level security so each person can only read and write their own rows.
3. Open **Project Settings → API** and copy the **Project URL** and the **anon public** key into [`config.js`](config.js). The anon key is designed to be public: the security rules do the protecting.

### 2. Create your two accounts
Sign-in uses email and password, so Supabase never needs to send an email.
1. Open **Authentication → Users → Add user → Create new user**.
2. Enter the email and a password, and tick **Auto Confirm User**. Repeat for the second person.
3. Open **Authentication → Sign In / Providers** and switch off **Allow new users to sign up**, so nobody else can create an account. Your two accounts keep working.

To change a password later, open the user in **Authentication → Users** and set a new one.

### 3. Turn on GitHub Pages
1. In the repo, open **Settings → Pages**.
2. Set **Source** to *Deploy from a branch*, branch `main`, folder `/ (root)`, then save.
3. After a minute the site is live at `https://scottdh.github.io/fitness-plans/`.

### 4. Sign in
Each of you opens the site, signs in and picks your plan. You stay signed in on that device.

**On a phone:** open the site in Safari, tap Share → **Add to Home Screen**, then sign in from the home-screen app. Saving the password to your keychain makes this a one-tap job.

## Zwift workouts
`zwo/scott/` and `zwo/emma/` hold the structured workouts, and `zwo/scott.zip` / `zwo/emma.zip` hold each full set. Each session on the site links its own file, and the footer links the zip.

To install: copy the `.zwo` files into `Documents/Zwift/Workouts/<your Zwift user number>/` on the computer that runs Zwift (each of you has your own numbered folder once you've signed in to Zwift there). Restart Zwift and they appear under **Custom Workouts**.

Ramp tests use Zwift's built-in Ramp Test, so they have no file. Group rides and outdoor rides don't either.

Targets are percentages of FTP. Each rider's Zwift profile needs their own weight and FTP, and the FTP box on the site adds watt targets to the plan text.

### Changing the workouts
Edit the sessions in [`scripts/gen_zwo.py`](scripts/gen_zwo.py), then run:
```sh
python3 scripts/gen_zwo.py
```
It rewrites the `.zwo` files, the zips and `zwo/index.json`. Plan text shown on the site lives in [`plans.js`](plans.js); keep the two in step.

## Files
| Path | What it is |
| --- | --- |
| `index.html`, `styles.css`, `app.js` | The site. Plain HTML, CSS and JS, no build step. |
| `plans.js` | Both plans: dates, phases, weekly sessions. |
| `config.js` | Your Supabase URL and anon key. |
| `supabase/schema.sql` | Database tables and security rules. |
| `scripts/gen_zwo.py` | Generates the Zwift workout files. |
| `zwo/` | Generated workouts, zips and index. |

## Data
Logs are stored in your Supabase project, one row per session per person. To back them up, open **Table Editor → logs → Export to CSV**.
