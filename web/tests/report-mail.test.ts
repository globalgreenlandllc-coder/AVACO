import { describe, expect, it } from "vitest";
import { en } from "@/lib/i18n/en";
import { ru } from "@/lib/i18n/ru";
import { renderReportMail } from "@/lib/report-mail";

const data = { date: "26 September 2026", pieces: ["Type report", "Industry chapter · Automotive", "Couple's report · Dana and Lena"], url: "https://www.avocousa.us/reports/abc", to: "dana@example.com" };

describe("the email that carries a report file", () => {
  it("names the date, lists what the file holds, links the report and says why it was sent", () => {
    const mail = renderReportMail(data, en.report.mail, "en");
    expect(mail.subject).toBe("Your AVOCO voice report · 26 September 2026");
    for (const piece of data.pieces) { expect(mail.html).toContain(piece.replace("'", "&#39;")); expect(mail.text).toContain(piece); }
    expect(mail.html).toContain('href="https://www.avocousa.us/reports/abc"');
    expect(mail.text).toContain("https://www.avocousa.us/reports/abc");
    expect(mail.html).toContain("dana@example.com");
    expect(mail.html).not.toContain("{to}");
    expect(mail.text).not.toMatch(/\{\w+\}/);
  });

  it("escapes what a piece name could carry", () => {
    const mail = renderReportMail({ ...data, pieces: ['<script>alert("x")</script>'] }, en.report.mail, "en");
    expect(mail.html).not.toContain("<script>");
    expect(mail.html).toContain("&lt;script&gt;");
  });

  it("reads in Russian too", () => {
    const mail = renderReportMail(data, ru.report.mail, "ru");
    expect(mail.subject).toContain("26 September 2026");
    expect(mail.html).toContain('lang="ru"');
    expect(mail.text).toContain(ru.report.mail.contains);
  });
});
