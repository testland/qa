# HTTP caching spec quotes (verbatim citations)

The load-bearing clauses behind the skill's HTTP claims, kept verbatim
so the facts stay sourced.

## Shared vs private cache

RFC 9111 §1: "A 'shared cache' is a cache that stores responses for
reuse by more than one user; shared caches are usually (but not always)
deployed as a part of an intermediary", while "A 'private cache', in
contrast, is dedicated to a single user"
([RFC 9111 §1](https://www.rfc-editor.org/rfc/rfc9111.html)).

## Keyed and unkeyed inputs

PortSwigger, web cache poisoning: "Caches identify equivalent requests
by comparing a predefined subset of the request's components, known
collectively as the 'cache key'. Typically, this would contain the
request line and `Host` header", and "Components of the request that are
not included in the cache key are said to be 'unkeyed'"
([PortSwigger, web cache poisoning](https://portswigger.net/web-security/web-cache-poisoning)).

## Poisoning and deception

Web cache poisoning "manipulates cache keys to inject malicious content
into a cached response, which is then served to other users", and web
cache deception "exploits cache rules to trick the cache into storing
sensitive or private content, which the attacker can then access"
([PortSwigger, web cache deception](https://portswigger.net/web-security/web-cache-deception)).

## What Vary does

RFC 9110 §12.5.5: `Vary` "indicates which request header fields were
used in content negotiation to determine what representation was
selected", and "Caches use this field as a secondary key in cache
lookups to ensure stored responses match the negotiation criteria of new
requests"
([RFC 9110 §12.5.5](https://www.rfc-editor.org/rfc/rfc9110.html)).

## The binding reuse rule and Vary: *

RFC 9111 §4.1: a cache "MUST NOT use that stored response without
revalidation unless all the presented request header fields nominated by
that Vary field value match those fields in the original request". And
"A stored response with a Vary header field value containing a member
'*' always fails to match"
([RFC 9111 §4.1](https://www.rfc-editor.org/rfc/rfc9111.html)), so
`Vary: *` disables shared-cache reuse entirely rather than keying more
finely.

## The private directive

RFC 9111 §5.2.2.7: `private` "indicates that a shared cache MUST NOT
store the response (i.e., the response is intended for a single user)".
The same section warns that "This usage of the word 'private' only
controls where the response can be stored; it cannot ensure the privacy
of the message content"
([RFC 9111 §5.2.2.7](https://www.rfc-editor.org/rfc/rfc9111.html)). It is
a cache-placement directive, not a protection.

## Path-confusion cache deception (OWASP)

The OWASP Web Security Testing Guide's remediation for path-confusion
driven cache deception is to "Refrain from classify/handling cached
based on file extension or path (leverage content-type)", to "Ensure the
caching mechanism(s) adhere to cache-control headers specified by your
application", and to "Implement RFC compliant File Not Found handling and
redirects"
([OWASP WSTG, Test for Path Confusion](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/02-Configuration_and_Deployment_Management_Testing/13-Test_for_Path_Confusion)).
A CDN that caches by suffix will store `/dashboard/x.css` no matter what
your `Cache-Control` said.
