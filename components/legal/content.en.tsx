import { ControllerAddress, controller } from "./controller";
import type { LegalSection } from "./legal-document";
import { StorageTable } from "./storage-table";

export const noticeEN: readonly LegalSection[] = [
  {
    id: "noticeEN-1",
    title: "Provider",
    content: (
      <>
        <ControllerAddress language="en" />
      </>
    ),
  },
  {
    id: "noticeEN-2",
    title: "Contact",
    content: (
      <>
        <p>
          {"E-mail: "}
          <a href={`mailto:${controller.legalEmail}`}>
            {controller.legalEmail}
          </a>
          {"\nContact form: "}
          <a href={controller.contactUrl}>{"beastyrabbit.com/kontakt"}</a>
        </p>
      </>
    ),
  },
  {
    id: "noticeEN-3",
    title: "Note",
    content: (
      <>
        <p>{"Moddrop is a private, non-commercial project."}</p>
      </>
    ),
  },
  {
    id: "noticeEN-4",
    title: "Privacy",
    content: (
      <>
        <p>
          {"For information on how personal data is processed, see the "}
          <a href="/privacy">{"Privacy Policy"}</a>
          {"."}
        </p>
      </>
    ),
  },
];

export const privacyEN: readonly LegalSection[] = [
  {
    id: "privacyEN-1",
    title: "Controller",
    content: (
      <>
        <p>
          {
            "The controller responsible for processing personal data on https://moddrop.live is:"
          }
        </p>
        <ControllerAddress language="en" />
        <p>
          {"E-mail: "}
          <a href={`mailto:${controller.privacyEmail}`}>
            {controller.privacyEmail}
          </a>
        </p>
        <p>
          {
            "No data protection officer has been appointed, as there is no legal obligation to do so."
          }
        </p>
      </>
    ),
  },
  {
    id: "privacyEN-2",
    title: "Overview",
    content: (
      <>
        <p>
          {
            "This policy explains which personal data is processed when you use Moddrop, for what purposes, on which legal basis, and for how long. Moddrop is a private, non-commercial project. Moddrop gives streamers and moderators a shared canvas for live overlays in OBS."
          }
        </p>
        <p>
          {
            "Personal data is not sold and not used for advertising. There is no automated decision-making, including profiling, within the meaning of Art. 22 GDPR. After embedded Twitch or YouTube content is loaded, the platforms may process data for their own advertising, as described in the section on embeds."
          }
        </p>
      </>
    ),
  },
  {
    id: "privacyEN-3",
    title: "Hosting and delivery",
    content: (
      <>
        <p>
          {
            "Moddrop runs on the controller's own server infrastructure in Germany. Requests from the internet reach the application through a reverse proxy on a virtual server operated by netcup GmbH, Emmy-Noether-Straße 10, 76131 Karlsruhe, Germany (data center in Nuremberg). netcup processes the data as a processor under a data processing agreement pursuant to Art. 28 GDPR. The connection is TLS-encrypted up to the reverse proxy and forwarded from there to the controller's infrastructure through an encrypted tunnel."
          }
        </p>
        <p>
          {
            "The legal basis is Art. 6(1)(f) GDPR. The legitimate interest is the secure and reliable provision of the website."
          }
        </p>
        <p>
          {
            "The following backup information applies to the database, whose Longhorn volumes use the default recurring-job group. Backup copies are stored within the controller's own infrastructure and overwritten after no more than three months. Backup coverage and retention for uploaded files in the separate Garage storage remain to be established."
          }
        </p>
      </>
    ),
  },
  {
    id: "privacyEN-4",
    title: "Server log files",
    content: (
      <>
        <p>
          {
            "For every request, the reverse proxy automatically stores the following data:"
          }
        </p>
        <ul>
          <li>{"IP address of the requesting device"}</li>
          <li>{"date and time of access"}</li>
          <li>
            {
              "requested address (path including parameters), HTTP method and protocol"
            }
          </li>
          <li>
            {"HTTP status code, amount of data transferred, and response time"}
          </li>
          <li>{"browser identifier (user agent)"}</li>
          <li>{"TLS version and cipher used"}</li>
          <li>{"target service"}</li>
        </ul>
        <p>
          {
            "The Cookie and Authorization headers are redacted. URL paths and query parameters are logged."
          }
        </p>
        <p>
          {
            "This data is used to operate the site, analyse errors, and defend against attacks and abuse. The legal basis is Art. 6(1)(f) GDPR. The legitimate interest is the stability and security of the service. Log files are deleted automatically after 14 days."
          }
        </p>
        <p>
          {
            "Pangolin also processes HTTP request logs, deleted after 14 days, and network logs, deleted after 30 days. Moddrop is public and does not use Pangolin/Pocket-ID SSO. The application logs security events with a truncated IP-derived hash and, where relevant, upload identifiers, rejected WebSocket origins, and error names and messages. General logging of e-mail addresses or request bodies is not configured in the application code; technical error objects may contain further metadata. This data exists only in short-lived Kubernetes container logs without central aggregation. No fixed retention period is configured for these logs. Retention of local CrowdSec alerts and blocking decisions, including any backups, remains to be established. The legal basis is Art. 6(1)(f) GDPR; the legitimate interests are troubleshooting and abuse prevention. Rate limiting also processes connection addresses in memory; inactive entries may remain until cleanup or restart."
          }
        </p>
      </>
    ),
  },
  {
    id: "privacyEN-5",
    title: "Protection against attacks (CrowdSec)",
    content: (
      <>
        <p>
          {
            "To protect against attacks, the security software CrowdSec automatically analyses the server log files and blocks IP addresses that are clearly the source of attacks (for example mass login attempts or scanning for vulnerabilities). When CrowdSec detects an attack, the IP address, time and type of attack are sent to CrowdSec SAS, 20 rue Maurice Arnoux, 92120 Montrouge, France. CrowdSec uses these reports for a shared blocklist that protects many servers. No data is sent to CrowdSec during normal browsing."
          }
        </p>
        <p>
          {
            "The legal basis is Art. 6(1)(f) GDPR. The legitimate interest is protecting the website and its users from attacks."
          }
        </p>
        <p>
          {
            "According to CrowdSec, the controller and CrowdSec are jointly responsible for this processing (Art. 26 GDPR): CrowdSec is responsible for operating its central services and blocklists, the controller for its use on this server. You can exercise your rights against either of them; CrowdSec can be reached at "
          }
          <a href="mailto:dpo@crowdsec.net">{"dpo@crowdsec.net"}</a>
          {
            ". CrowdSec may pass the reported data on to members and partners of its network. According to CrowdSec, transfers to countries outside the EU are based on the European Commission's Standard Contractual Clauses (Art. 46(2)(c) GDPR)."
          }
        </p>
        <p>
          {
            "Full IP addresses are generally retained for no more than three months and then progressively generalised. CrowdSec describes exceptions of up to one year before anonymisation for certain attack analyses and training purposes. Details: "
          }
          <a href="https://www.crowdsec.net/privacy-policy">
            {"crowdsec.net/privacy-policy"}
          </a>
          {"."}
        </p>
      </>
    ),
  },
  {
    id: "privacyEN-6",
    title: "User account and content",
    content: (
      <>
        <p>
          {
            "Moddrop stores the Clerk user ID, username and search key, profile-picture display preference, and timestamps in PostgreSQL. Other signed-in users can search usernames for collaboration. Rooms contain owner and member IDs, an optional Twitch channel, YouTube permission settings and acknowledgment timestamp, and a hashed OBS access secret. The current canvas synchronisation snapshot, revisions and timestamps are also stored, together with upload filenames, media type, size, object identifier and timestamp. Uploaded files reside in the controller's own S3-compatible Garage storage in Germany. Room participants and authorised OBS sources receive content needed for shared editing and display. Content placed in the visible stream area can be broadcast publicly."
          }
        </p>
        <p>
          {
            "The purposes are requested collaboration, media delivery and access control. The legal basis is Art. 6(1)(f) GDPR; the legitimate interest is providing these functions to authorised users. Accounts, profile and user records, rooms, canvas content and uploads remain stored until you delete data in the app, where a deletion function is available, or request deletion. You can remove elements in the canvas; this does not delete the associated uploaded files and metadata. Moddrop currently has no deletion function for accounts, user records, rooms or uploads. No automatic deletion deadline is implemented. Deleting the Clerk account alone does not remove Moddrop's own records. On a deletion request, these records are deleted manually. Please send erasure requests to "
          }
          <a href={`mailto:${controller.privacyEmail}`}>
            {controller.privacyEmail}
          </a>
          {"."}
        </p>
      </>
    ),
  },
  {
    id: "privacyEN-7",
    title: "Clerk",
    content: (
      <>
        <p>
          {
            "Sign-in uses Clerk, Inc., 660 King Street, Unit 345, San Francisco, CA 94107, USA. The browser contacts clerk.moddrop.live for scripts and authentication configuration even on public pages; sign-in can also load profile images from img.clerk.com. Clerk processes connection data such as IP address and browser identifier and, on sign-in, account information, user ID, e-mail address, username and, where applicable, profile image. Clerk manages authentication credentials. The backend verifies Clerk access tokens and retrieves user profiles when needed."
          }
        </p>
        <p>
          {
            "The purpose is identity and access management. The legal basis is Art. 6(1)(f) GDPR; the legitimate interest is restricting editing to authorised users. Cookies and local configuration entries needed for sign-in and session management are technically necessary under Section 25(2) no. 2 TDDDG. Clerk may process data in the USA and other countries. Its "
          }
          <a href="https://clerk.com/legal/dpa">
            {"data processing agreement"}
          </a>
          {
            " provides for the EU-US Data Privacy Framework and EU Standard Contractual Clauses as a fallback. Clerk is listed in the DPF directory with active EU-US status for non-HR data. Clerk describes purpose-based retention; a fixed period for this user account has not been confirmed. Contractual deletion within 90 days of the service agreement ending does not promise deletion of an individual user account. Further information: "
          }
          <a href="https://clerk.com/legal/privacy">{"Clerk privacy policy"}</a>
          {"."}
        </p>
      </>
    ),
  },
  {
    id: "privacyEN-8",
    title: "Optional platform sign-in",
    content: (
      <>
        <p>
          {
            "The sign-in interface optionally offers Discord and Twitch. A connection to the selected platform account only occurs when you choose that sign-in method. Connection data and identity information you authorise at the platform are exchanged between the platform and Clerk. Moddrop uses this sign-in for access management under Art. 6(1)(f) GDPR. The requested permissions are shown during sign-in; a full assessment of those permissions remains outstanding."
          }
        </p>
        <p>
          {
            "Discord names Discord Netherlands BV, Schiphol Boulevard 195, 1118 BG Schiphol, Netherlands, for EEA residents, and Discord Inc., 444 De Haro Street #200, San Francisco, CA 94107, USA, for other regions. Discord also processes data in the USA and other countries and describes Standard Contractual Clauses and the Data Privacy Framework as transfer mechanisms. Discord is listed in the DPF directory for non-HR data as active with re-certification under review. Retention and further processing follow the "
          }
          <a href="https://discord.com/privacy">{"Discord privacy policy"}</a>
          {"; an application-specific fixed period has not been confirmed."}
        </p>
        <p>
          {
            "Twitch is provided by Twitch Interactive, Inc., 350 Bush Street, 2nd Floor, San Francisco, CA 94104, USA. Twitch describes processing in the USA and other countries and retaining data while required for the stated purposes or legal obligations. A specific transfer mechanism for this integration has not yet been confirmed. See the "
          }
          <a href="https://legal.twitch.com/en/legal/privacy-notice/">
            {"Twitch privacy notice"}
          </a>
          {"."}
        </p>
      </>
    ),
  },
  {
    id: "embeds",
    title: "Twitch and YouTube embeds",
    content: (
      <>
        <p>
          {
            "In the control interface, Twitch and YouTube players load only after you explicitly click “Load Twitch player” or “Load YouTube video”. Before that click, these embeds load no provider scripts or players. After the click, the browser loads embed.twitch.tv/embed/v1.js for Twitch or www.youtube.com/iframe_api for YouTube, along with the respective players. The platforms receive, in particular, your IP address, browser/connection data, the page visited, and channel or video selection. They may use cookies and process usage data for their own purposes, including advertising. Content may autoplay while muted."
          }
        </p>
        <p>
          {
            "Twitch is provided by the company named in the preceding section. For YouTube, Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Ireland, is responsible for EEA users. Data may be transferred to Google LLC, 1600 Amphitheatre Parkway, Mountain View, CA 94043, USA, and other countries. Google describes DPF and Standard Contractual Clauses in its "
          }
          <a href="https://policies.google.com/privacy/frameworks">
            {"transfer frameworks"}
          </a>
          {
            "; Google LLC is listed in the DPF directory with active EU-US status. Details of purpose-based retention are in the "
          }
          <a href="https://policies.google.com/privacy">
            {"Google privacy policy"}
          </a>
          {"."}
        </p>
        <p>
          {
            "Clicking gives consent to load the selected embed under Section 25(1) TDDDG and Art. 6(1)(a) GDPR. The choice is held only in this page's memory and is not persisted in browser storage. Reloading withdraws consent for further loading; cookies already set by the platforms can be removed in browser settings. Withdrawal does not affect the lawfulness of processing before withdrawal. The OBS browser source continues to load the output configured by the room owner automatically. This is necessary to deliver that output under Section 25(2) no. 2 TDDDG and Art. 6(1)(f) GDPR, with the legitimate interest of providing the requested stream output. The room's YouTube policy also applies: disabled YouTube loads no player, and OBS output still requires the owner's allow_on_air setting and risk acknowledgment. That acknowledgment does not replace a control user's consent. The specific platform cookies and their periods, and Twitch transfer safeguards, remain to be established."
          }
        </p>
      </>
    ),
  },
  {
    id: "tldraw-licence",
    title: "tldraw licence validation",
    content: (
      <>
        <p>
          The canvas uses the tldraw library. Icons, fonts and translations are
          served with Moddrop itself; drawings synchronise with the controller's
          own backend. The current production licence is valid but enables a
          watermark request to cdn.tldraw.com. This sends connection data,
          licence ID, licence type, SDK version and the full page address. The
          licence signature is verified locally.
        </p>
        <p>
          The current public privacy policy names tldraw Inc., with contact
          address Floor 3, The Arts Building, Morris Pl, Finsbury Park, London
          N4 3JG, United Kingdom, and processing in the USA among other
          locations. The necessity and legal basis of this additional request,
          the policy's applicability to SDK reports, retention and transfer
          safeguards remain to be established. Further information:{" "}
          <a href="https://tldraw.dev/sdk-features/license-key">
            tldraw licence information
          </a>{" "}
          and <a href="https://www.tldraw.com/privacy.html">privacy policy</a>.
        </p>
      </>
    ),
  },
  {
    id: "privacyEN-10",
    title: "Contact by e-mail",
    content: (
      <>
        <p>
          {
            "If you contact us by e-mail, your e-mail address, the content of your message and the technical details of the e-mail are processed to answer your request. The legal basis is Art. 6(1)(f) GDPR. The legitimate interest is being able to answer requests."
          }
        </p>
        <p>
          {
            "The mailboxes are hosted by Fastmail Pty Ltd, PO Box 234, Collins Street West, VIC 8007, Australia, as a processor. Data may be transferred to countries outside the EU, in particular Australia, the USA and India. For these transfers, Fastmail uses the European Commission's Standard Contractual Clauses (Art. 46(2)(c) GDPR). Details: "
          }
          <a href="https://www.fastmail.com/policies/privacy/">
            {"Fastmail privacy policy"}
          </a>
          {", "}
          <a href="https://www.fastmail.com/policies/dpa/">
            {"data processing agreement"}
          </a>
          {" and "}
          <a href="https://www.fastmail.com/policies/dpa/section3/">
            {"Standard Contractual Clauses"}
          </a>
          {". You can obtain a copy of the safeguards by writing to "}
          <a href={`mailto:${controller.privacyEmail}`}>
            {controller.privacyEmail}
          </a>
          {"."}
        </p>
        <p>
          {
            "The controller deletes messages after dealing with the request unless retention remains necessary. Fastmail may subsequently retain backup and log data under its published deletion rules."
          }
        </p>
      </>
    ),
  },
  {
    id: "privacyEN-11",
    title: "Cookies and local storage",
    content: (
      <>
        {" "}
        <StorageTable language="en" />
        <p>
          {
            "Clerk cookies __client_uat and __client_uat_<suffix>, lasting approximately 400 days, and the __clerk_environment localStorage entry without automatic browser expiry are technically necessary for sign-in and session management under Section 25(2) no. 2 TDDDG. The first two cookie names and configuration were observed while signed out. Clerk also documents __session on the application domain with a 60-second token lifetime and __client on clerk.moddrop.live with a browser-dependent lifetime for signed-in users. These session cookies were verified in official documentation, not observed in an authenticated session."
          }
        </p>
        <p>
          {
            "Moddrop uses sessionStorage at moddrop:obsSetupSecret:<roomId> to hand over the one-time OBS access secret. localStorage at moddrop:media-preferences:v1:<userId>:<roomId> stores volume and mute settings. The locally integrated editor library writes TLDRAW_USER_DATA_v3 in localStorage and TLDRAW_TAB_ID_v2 in sessionStorage as first-party storage. Editor assets are served by Moddrop itself. These entries were identified from code. sessionStorage and IndexedDB were empty on the inspected public pages; no additional local canvas database is configured."
          }
        </p>
        <p>
          {
            "Section 25(2) no. 2 TDDDG applies to strictly necessary storage access. The necessity of permanent preference storage remains to be established. Non-essential access requires consent under Section 25(1) TDDDG and, for personal data, Art. 6(1)(a) GDPR. Consent collection for the unresolved preference accesses is currently not implemented. The decision to load an embedded player stays only in memory. You can delete local data in browser settings. This does not delete server data."
          }
        </p>
      </>
    ),
  },
  {
    id: "privacyEN-12",
    title: "Your rights",
    content: (
      <>
        <p>{"You have the following rights regarding your personal data:"}</p>
        <ul>
          <li>{"access (Art. 15 GDPR)"}</li>
          <li>{"rectification (Art. 16 GDPR)"}</li>
          <li>{"erasure (Art. 17 GDPR)"}</li>
          <li>{"restriction of processing (Art. 18 GDPR)"}</li>
          <li>{"data portability (Art. 20 GDPR)"}</li>
          <li>
            {
              "withdrawal of consent (Art. 7(3) GDPR): you may withdraw consent at any time. Withdrawal does not affect the lawfulness of processing before withdrawal."
            }
          </li>
        </ul>
        <p>
          <strong>{"Right to object (Art. 21 GDPR):"}</strong>
          {
            " Where processing is based on Art. 6(1)(f) GDPR, you may object at any time on grounds relating to your particular situation."
          }
        </p>
        <p>
          {"To exercise your rights, simply send a message to "}
          <a href={`mailto:${controller.privacyEmail}`}>
            {controller.privacyEmail}
          </a>
          {"."}
        </p>
        <p>
          {
            "You also have the right to lodge a complaint with a data protection supervisory authority, in particular in the member state of your habitual residence, place of work or place of the alleged infringement (Art. 77 GDPR)."
          }
        </p>
      </>
    ),
  },
  {
    id: "privacyEN-13",
    title: "Obligation to provide data",
    content: (
      <>
        <p>
          {
            "You are not obliged to provide personal data. However, the website cannot be delivered without the technically necessary connection data, and the protected areas cannot be used without signing in."
          }
        </p>
      </>
    ),
  },
  {
    id: "privacyEN-14",
    title: "Changes",
    content: (
      <>
        <p>
          {
            "This privacy policy is updated when the website or the legal situation changes. The version published here applies."
          }
        </p>
      </>
    ),
  },
];
