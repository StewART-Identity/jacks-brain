# Jack's Rules for Website Design

> Especially for websites focused on taking payments for medical services, most people can barely use a computer much less type your needlessly and stupidly long URL.

**The principle: match the medium to the message.** A URL printed on paper is a transcription task. Every character is an opportunity for a typo. If you expect someone to type `medicaldebt.com/pay/INV-8472` from a printed statement, make it exactly that. Don't print your internal routing structure on paper and expect a sixty-year-old with a smartphone to get it right on the first try. There's a whole field of study — information scent and cognitive load — that boils down to: *don't.*

---

## 4. Do not make pull-down menus appear anywhere except over the location of the menu.

> Today I used a form that, when you selected a pull-down menu, its values appeared in the upper left corner of the screen. It's a slippery slope from this to communism!

**The principle: spatial continuity.** Users maintain a mental model of where interface objects are. When you teleport a menu's contents across the screen, you break that model and force the user to re-acquire the interface. The formal term is *locus of attention preservation*. The informal term is *don't be insane*.

---

## 5. Do not use a drop-down menu for days of the month or — most importantly — years.

> You are breaking the Geneva Conventions if you make me play *The Price Is Right* trying to enter my birth year.

**The principle: match the control to the data's cognitive shape.** A dropdown works when the user is picking from a short list of discrete options they're mentally choosing between. A birth year isn't chosen; it's *recalled*. Forcing someone to scroll through 80+ options to find a known value is a category error. The right control here is a four-digit text input with validation. Better yet: a full date-of-birth input with its own picker, which every modern browser supplies for free.

---

## 6. Do not make me retype information.

> Even if someone may use a different billing address, at least TRY to be a decent human being and populate it with what you have. I really don't mind typing over it — A+ for effort!

**The principle: pre-population, aka respecting the user's prior investment of effort.** If the user has already told you something once — their shipping address, their phone number, their last credit card — the system should remember. Re-asking the same question across forms reads as either laziness or a complete absence of a shared database. Don Norman would describe the feeling as "the system is fighting me." Which, if you've filled out an insurance claim lately, tracks.

---

## 7. Do not put acknowledgment dialogs (Yes/No, Submit/Cancel, etc.) on the opposite side of the screen.

> Even though it might be popular in current user experience design, I hate you for it.

**The principle: convention preservation + Fitts's Law.** Users have learned over decades where "Cancel" and "Confirm" go. Some platforms put Confirm on the right (Windows, web), some on the left (macOS) — either is fine, but flipping the convention *within a single interface* creates accidental clicks. Fitts's Law adds that the distance you travel to a target matters; spreading critical buttons to opposite corners forces unnecessary mouse travel and increases error rates. It's a real phenomenon studied since 1954. Your designer can look it up.

---

## 8. Allow your users to enter any format for credit card numbers.

For example: `1111222233334444`, `1111 2222 3333 4444`, `1111-2222-3333-4444`.

> If you don't accept all of these formats, you employ shit programmers who should be sentenced to stubbing their toes once a day for the rest of their lives.

**The principle: Postel's Law, aka the robustness principle.** "Be liberal in what you accept, strict in what you emit." Strip whitespace and dashes on the server side before processing. It's a five-character regex. The user's job is to give you a credit card number; it's not their job to guess your preferred formatting convention. If your form rejects `1111 2222 3333 4444`, your form is broken.

---

## 9. Do not make me tell you that my credit card is a Visa, MasterCard, etc.

> The type of card is encoded in the number. For the Love of God, STAHP IT!

**The principle: don't ask the computer to ask the user what the computer already knows.** Every credit card starts with an Issuer Identification Number (IIN) that identifies the network: Visa starts with 4, MasterCard with 5, American Express with 34 or 37, Discover with 6. This is public information, checkable in JavaScript before the form is even submitted. Asking the user to pick from a dropdown is asking them to do the computer's job. It's 2026. Don't.

---

## 10. Error-check credit card numbers before attempting to process them.

> Don't send me an email after the fact saying you couldn't process my payment. You want to get paid, don't you? Then fucking act like it.

**The principle: fail fast.** Valid credit card numbers have a mathematical checksum (the Luhn algorithm — twelve lines of code, invented in 1954, still in use today). Any validly-formatted card number can be instantly verified as at least *possibly* real before hitting the payment processor. Any typo in the last four digits gets caught in the browser. The earlier an error is surfaced, the less context the user has to rebuild when they fix it. Catching a transposed digit after "Thank you, your payment is processing" and emailing the user hours later is a deliberate choice to maximize frustration.

---

## 11. Allow the user to enter the expiration month and year as `mmyy`.

> Don't get fancy and have a pull-down for both month and year. I'm paying you for an ambulance ride I took over a year ago — I'm not sending you a hand-crafted sonnet.

**The principle: single input over coordinated inputs.** Every time you split one logical value into two controls, you create a coordination problem: tab order, validation, cross-field errors, which field shows the error message when one is missing. `0527` is a single string every human recognizes as May 2027. It's embossed on the card in exactly that format. Making it two dropdowns is performative complexity.

---

## 12. Charge credit cards immediately.

> Do not wait until your nightly batch processing, or make the user wait for some other '80s-style computing bullshit. I'm looking at YOU, Amazon!

**The principle: feedback immediacy.** When the user hits Submit, the transaction should complete (or fail visibly) before they leave the page. Ambiguous delays — "your order is processing, we'll email you" — create anxiety and trust erosion. The user cannot tell the difference between "the payment is batch-processing overnight" and "your card was declined and someone will tell you eventually." Both look identical from their side. Trust is a function of transparency about state.

---

## 13. If you require someone to use a picker UI element to enter their birth year or weight, you and your pets deserve to go straight to the eternal flames of perdition.

> I had to do that recently, and I thought I was on the fucking *Price Is Right* trying to spin the Big Wheel!

**The principle: match the control to the data's cognitive shape (reprise).** A picker/spinner/stepper is appropriate for a narrow bounded range where the user is likely to adjust by one or two steps from a sensible default. "Number of adults" at a hotel: fine. "Birth year" for someone born in 1962 who has to click up-arrow 64 times from the default year: torturous. The rule of thumb: if a typical user would change this value by more than ~5 steps, a spinner is the wrong control.

---

## 14. If your app makes me go to your website to modify my personal information or — most annoyingly — CHANGE MY PASSWORD …

> I hope you are sent to a North Korean "Reeducation Center" and, while there, develop hemorrhoids the size and texture of sugarplums!

**The principle: context preservation.** When someone is in your app, they are *in your app*. Yanking them out to a browser to perform an account operation is a task-switch that costs them their current mental context, their authentication state, and their trust. It's also a terrible security lesson: you're training users that legitimate apps bounce them to external URLs, which is exactly the behavior phishing depends on. If it's a thing a user does in your product, it should be a thing they can do *in your product.*

---

## The rule behind all the rules

When I wrote these, I thought I was a cranky user with opinions. Looking back, every rule collapses into a single principle:

**The computer should work harder so the user works less.**

Alan Kay called the computer "a bicycle for the mind." A bicycle is a tool that multiplies your output — if you're pedaling uphill the whole time, the tool isn't working.

Every time a form asks you to pick your card type from a dropdown, it's handing you a task the computer could have done for free. Every birth-year spinner is a refusal to meet the user where they are. Every "we'll email you about the transaction tomorrow" is a choice to prioritize batch-processing convenience over human trust. Every redirect you didn't set up, every dropdown-that-teleports, every long URL printed on a paper bill — it's all the same failure: *the system is making the user do the system's job.*

And the reason this matters: if you design systems for a living, the user-facing behaviors you accept are a form of communication. The user can tell whether you respected their time. They don't always have words for it — but they can tell.

So. Some of these rules might be profane. All of them, it turns out, are true.

---

*Jack Stewart is an IAM Engineer at UNT System. He has opinions about websites.*
