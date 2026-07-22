import { test, expect } from "@playwright/test";
import * as OTPAuth from "otpauth";

const logEntries = require("../data.json");
const USERNAME = process.env.USERNAME;
const PASSWORD = process.env.PASSWORD;
const MFA_SECRET = process.env.MFA_SECRET;

test("Log 'On The Job' Hours", async ({ page }) => {
  await page.goto("https://education.oneadvanced.com");
  await page.getByRole("textbox", { name: "Username" }).fill(USERNAME);
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByRole("textbox", { name: "Password" }).fill(PASSWORD);
  await page.getByRole("button", { name: "Log In" }).click();

  // MFA
  const totp = MFA_SECRET.startsWith("otpauth://")
    ? OTPAuth.URI.parse(MFA_SECRET)
    : new OTPAuth.TOTP({
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: MFA_SECRET,
      });

  const otpCode = totp.generate();
  await page.getByRole("textbox", { name: "Verification code" }).fill(otpCode);
  await page.getByRole("button", { name: "Submit" }).click();

  // Navigate to timelog
  await page.getByRole("link", { name: "Timelog" }).click();

  const entriesContainer = page.locator(".mds-accordion");

  // Add entries
  for (const entry of logEntries) {
    const formattedTimeSpent = `${entry.hoursSpent}h`;
    const displayDate = entry.date.replace(/\/20(\d{2})$/, "/$1");

    // Check if the entry is already present in the accordion list
    const existingRow = entriesContainer
      .locator(".mds-accordion-content__content > div")
      .filter({ hasText: displayDate })
      .filter({ hasText: formattedTimeSpent });

    if ((await existingRow.count()) > 0) {
      console.log(
        `⏩ ${entry.date} (${formattedTimeSpent}) already exists. Skipping...`,
      );
      continue;
    }

    console.log(`Processing: ${entry.date}`);

    await page.getByRole("button", { name: "Add Hours" }).click();

    // Target modal
    const addHoursModal = page.getByRole("dialog", {
      name: "Add Off-the-Job Hours",
    });

    await addHoursModal.getByLabel("Activity date").fill(entry.date);
    await page.keyboard.press("Escape");
    await addHoursModal.getByLabel("Time started").fill(entry.startTime);
    await page.keyboard.press("Escape");

    await addHoursModal
      .getByRole("spinbutton", { name: "Hours" })
      .fill(entry.hoursSpent);

    if (entry.minsSpent) {
      await addHoursModal
        .getByRole("spinbutton", { name: "Minutes" })
        .fill(entry.minsSpent);
    }

    await addHoursModal.locator("#activity-type").click();
    await page
      .getByRole("option", {
        name: "Gaining technical experience by doing my job",
      })
      .click();

    await addHoursModal.getByLabel("Impact").fill("N/A");

    await addHoursModal.getByRole("button", { name: "Add Hours" }).click();

    await addHoursModal.waitFor({ state: "hidden" });

    // Check if entries have been added
    try {
      await expect(existingRow.first()).toBeVisible({ timeout: 5000 });
      console.log(`✅ ${entry.date} has been added`);
    } catch (error) {
      console.error(`Couldn't find ${entry.date}`);
      throw error;
    }
  }
});
