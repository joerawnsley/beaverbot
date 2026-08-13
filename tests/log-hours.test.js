import { test, expect } from "@playwright/test";
import * as OTPAuth from "otpauth";

const logEntries = require("../data.json");
const USERNAME = process.env.USERNAME;
const PASSWORD = process.env.PASSWORD;
const MFA_SECRET = process.env.MFA_SECRET;

test("Log 'On The Job' Hours", async ({ page }) => {
  // Survey Popup Handler
  await page.addLocatorHandler(
    page.getByRole("button", { name: "Remind Me Later" }),
    async (locator) => {
      await locator.click();
    },
  );

  // Tutorial Popup Handler
  await page.addLocatorHandler(
    page.getByRole("button", { name: "Dismiss Button" }),
    async (locator) => {
      await locator.click();
    },
  );

  // 1. Authentication
  await page.goto("https://education.oneadvanced.com");
  await page.getByRole("textbox", { name: "Username" }).fill(USERNAME);
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByRole("textbox", { name: "Password" }).fill(PASSWORD);
  await page.getByRole("button", { name: "Log In" }).click();

  // 2. MFA
  const mfaInput = page.locator("#otp");
  await mfaInput.waitFor({ state: "visible", timeout: 5000 });

  const totp = OTPAuth.URI.parse(MFA_SECRET);
  const otpCode = totp.generate();

  await mfaInput.fill(otpCode);
  await page.getByRole("button", { name: "Submit" }).click();

  // 3. Navigation
  await page.getByRole("link", { name: "Timelog" }).click();

  const entriesContainer = page.locator(".mds-accordion");

  // Wait for the timelog accordion to render before reading entries
  await entriesContainer.first().waitFor({ state: "visible" });

  // 4. Process Entries
  for (const entry of logEntries) {
    const formattedHoursSpent = `${entry.hoursSpent}h`;
    const displayDate = entry.date.replace(/\/20(\d{2})$/, "/$1");

    const existingRow = entriesContainer
      .locator(".mds-accordion-content__content > div.mu-w-100")
      .filter({ hasText: displayDate })
      .filter({ hasText: formattedHoursSpent });

    if ((await existingRow.count()) > 0) {
      console.log(
        `⏩ ${entry.date} (${formattedHoursSpent}) already exists. Skipping...`,
      );
      continue;
    }

    console.log(`Processing: ${entry.date}`);

    await page.getByRole("button", { name: "Add Hours" }).first().click();

    const addHoursModal = page.getByRole("dialog", {
      name: "Add Off-the-Job Hours",
    });
    await addHoursModal.waitFor({ state: "visible" });

    const dateInput = addHoursModal.getByLabel("Activity date");
    await dateInput.fill(entry.date);
    await dateInput.press("Tab");

    const timeInput = addHoursModal.getByLabel("Time started");
    await timeInput.fill(entry.startTime);
    await timeInput.press("Tab");

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

    await Promise.all([
      page
        .waitForResponse(
          (res) =>
            res.status() === 200 &&
            res.request().method() === "POST" &&
            res.url().includes("/timelog"),
          { timeout: 10000 },
        )
        .catch(() => null), // Gracefully handle cases where request finishes before intercept
      addHoursModal.getByRole("button", { name: "Add Hours" }).click(),
    ]);

    await addHoursModal.waitFor({ state: "detached", timeout: 10000 });

    // Wait for modal to close
    await addHoursModal.waitFor({ state: "hidden" });

    if (!page.url().includes("timelog")) {
      console.warn(
        `⚠️ Redirect detected on ${entry.date}. Navigating back to Timelog...`,
      );
      await page.getByRole("link", { name: "Timelog" }).click();
      await entriesContainer.first().waitFor({ state: "visible" });
    }

    // Verify row addition
    try {
      await expect(existingRow.first()).toBeVisible({ timeout: 5000 });
      console.log(`✅ ${entry.date} has been added successfully.`);
    } catch (error) {
      console.error(`❌ Couldn't find row for ${entry.date} after submitting.`);
      throw error;
    }
  }
});
