# Beaverbot

Beaverbot is an automation tool for logging on-the-job hours.

> It's called beaverbot because it does the logging

To automate logging your own hours, you can fork this repo to use the GitHub action, or clone it to run it locally.

> Please note: the process will fail if an entry is duplicated, so you may have to go in and edit entries manually if it fails.

## Setup

Set up your OneAdvanced login, and add the details to 1Password.

You'll need to:

1. Open and unlock 1Password.
2. Select the entry for oneadvanced, then select Edit.
3. Select Add More, then select One-Time Password.
4. Select the QR code to scan the QR code from your screen or clipboard.
5. Select Save.
6. Select Edit, then click into the One-Time Password field.
7. Copy the value that starts `otpauth://`, this will be your `MFA_SECRET`in GitHub Secrets, or your `.env` file

## Using GitHub Actions

If you want to run the program as a GitHub Actions workflow, you'll need to add repository secrets.

In your own fork of the repo, go to `Settings` > `Secrets & Variables` > `Actions`

Select `New Repository Secret`, and add:

```
USERNAME (your SmartAssessor username)
PASSWORD (your SmartAssessor password)
MFA_SECRET (your MFA secret)
```

Commit your changes and manually trigger the GitHub Action to log your on the job hours.

## Running locally

If you want to run the program locally, you'll need to add a `.env` to the root of the directory, containing:

```
USERNAME (your SmartAssessor username)
PASSWORD (your SmartAssessor password)
MFA_SECRET (your MFA secret)
```

Update `data.json` with your on the job day/hour entries for the week.

An example of `data.json` is available in `data-example.json`, but fields for each entry are:

```
  {
    "date": "30/03/2026",
    "startTime": "09:00",
    "hoursSpent": "8",
    "minsSpent": "0" // optional entry
  },
```

Run `npx playwright test` to log your on the job hours.
