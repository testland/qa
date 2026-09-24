# #checkout-a11y — thread, 2026-09-12

## Proposal A — front-end lead

> Rather than chase individual fields, put one listener on the document and let
> the browser do the work:
>
>     document.addEventListener('focusin', (e) => {
>       e.target.scrollIntoView({ block: 'center', behavior: 'smooth' });
>     });
>
> Anything that takes focus ends up in the middle of the viewport, which is
> nowhere near either bar. That is the whole category closed in four lines and
> I can have it in tonight's build.

## Proposal B — design system PR #1188, queued behind the statement

> Brand refresh drops the browser ring in favour of the brand blue. Design
> signed this off last Thursday; it ships the week after the statement unless
> someone objects. Buttons, links and the Pay control were not in scope for the
> refresh and are not touched by this PR.
>
>     *:focus { outline: none; }
>
>     .field input:focus,
>     .field textarea:focus,
>     .field select:focus {
>       border-color: #1a73e8;
>       box-shadow: 0 0 0 1px #1a73e8;
>     }
