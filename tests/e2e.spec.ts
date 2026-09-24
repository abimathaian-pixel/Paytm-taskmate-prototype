import { test, expect } from "@playwright/test";

test.describe("Paytm TaskMate End-to-End Workflow", () => {
  test("Completes full electricity bill payment workflow", async ({ page }) => {
    // 1. Visit Dashboard
    await page.goto("/");
    await expect(page.locator("text=Paytm TaskMate")).toBeVisible();
    await expect(page.locator("text=Good afternoon, Aarendra")).toBeVisible();
    await expect(page.locator("text=Upcoming Bills")).toBeVisible();

    // 2. Open TaskMate
    await page.click("text=Ask TaskMate");
    await expect(page).toHaveURL(/.*\/taskmate/);
    await expect(page.locator("text=TaskMate AI Cockpit")).toBeVisible();

    // 3. Type "Handle my electricity bill"
    const input = page.locator('input[placeholder*="Ask TaskMate"]');
    await input.fill("Handle my electricity bill");
    await page.keyboard.press("Enter");

    // 4. Verify Bill found and Approval Card rendered
    await expect(page.locator("text=Payment Approval Required")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=Maharashtra Electricity")).toBeVisible();
    await expect(page.locator("text=₹2,450")).toBeVisible();

    // 5. User clicks Approve Payment
    await page.click("button:has-text('Approve Payment')");

    // 6. Mock UPI Authentication Screen appears
    await expect(page.locator("text=UPI Payment Authentication")).toBeVisible();
    await expect(page.locator("text=ENTER 4-DIGIT UPI PIN")).toBeVisible();

    // 7. Enter 4-digit PIN on isolated keypad
    await page.click("button:has-text('1')");
    await page.click("button:has-text('2')");
    await page.click("button:has-text('3')");
    await page.click("button:has-text('4')");
    await page.click("button:has-text('Confirm')");

    // 8. Payment succeeds and success receipt appears
    await expect(page.locator("text=Payment Successful")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=TXN-")).toBeVisible();

    // 9. Navigate to Transactions
    await page.click("text=View History");
    await expect(page).toHaveURL(/.*\/transactions/);
    await expect(page.locator("text=Transaction History")).toBeVisible();
    await expect(page.locator("text=Maharashtra Electricity")).toBeVisible();

    // 10. Verify Audit Log
    await page.goto("/audit");
    await expect(page.locator("text=Immutable Audit Trail")).toBeVisible();
    await expect(page.locator("text=APPROVAL_GRANTED")).toBeVisible();
    await expect(page.locator("text=AUTHENTICATION_COMPLETED")).toBeVisible();
  });
});
