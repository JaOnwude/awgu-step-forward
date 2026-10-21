"""Wording for account emails.

The code is deliberately left out of the subject line: on a shared phone the
subject shows on the lock screen and in notification previews.
"""

# The HTML email template keeps inline styles on one line each.
# ruff: noqa: E501

from __future__ import annotations

from html import escape


def sign_in_code_email(code: str, minutes: int) -> tuple[str, str, str]:
    """Return (subject, plain text, html) for a one-time sign-in code."""
    subject = "Your StepForward sign-in code"
    text = (
        f"Your one-time code is {code}\n\n"
        f"Enter it on the StepForward sign-in page. It works once and expires in "
        f"{minutes} minutes.\n\n"
        "StepForward will never ask you to pay to apply for an opportunity, and our "
        "team will never ask you for this code.\n\n"
        "If you didn't ask to sign in, you can ignore this email.\n\n"
        "Awgu StepForward"
    )
    safe = escape(code)
    html = f"""\
<!doctype html>
<html lang="en">
  <body style="margin:0;background:#fbf7ef;font-family:Arial,Helvetica,sans-serif;color:#15201a">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center" style="padding:32px 16px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
          style="max-width:480px;background:#ffffff;border:1px solid #e3daca;border-radius:16px">
          <tr><td style="padding:28px">
            <p style="margin:0 0 4px;font-size:11px;font-weight:bold;letter-spacing:2px;color:#b8501f">AWGU</p>
            <p style="margin:0 0 24px;font-size:20px;font-weight:bold;color:#0f5a43">StepForward</p>
            <p style="margin:0 0 12px;font-size:16px">Your one-time sign-in code is</p>
            <p style="margin:0 0 20px;font-size:34px;font-weight:bold;letter-spacing:8px;color:#0f5a43">{safe}</p>
            <p style="margin:0 0 16px;font-size:14px;color:#5a6459">
              Enter it on the sign-in page. It works once and expires in {minutes} minutes.
            </p>
            <p style="margin:0 0 16px;font-size:14px;color:#5a6459">
              StepForward will never ask you to pay to apply, and our team will never ask you for this code.
            </p>
            <p style="margin:0;font-size:13px;color:#5a6459">
              Didn't ask to sign in? You can ignore this email.
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>
"""
    return subject, text, html
