# File: `demo/integrations/zephyr/zephyrLink.ts`

**What it is:** A tiny helper every test uses: `zephyr('DEMO-T6', 'automation-scripts/checkout.spec.ts')`
writes the Zephyr key + script path into the Allure result so the platform
can link the failure to its test case.

**Why it exists:** This is how "which Zephyr test does this failure belong
to?" is answered in the demo.
