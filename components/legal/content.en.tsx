import { ControllerAddress, controller } from "./controller";
import type { LegalSection } from "./legal-document";
import { StorageTable } from "./storage-table";

export const noticeEN: readonly LegalSection[] = [
  {
    id: "noticeEN-1",
    title: "Provider",
    content: <ControllerAddress language="en" />,
  },
  {
    id: "noticeEN-2",
    title: "Contact",
    content: (
      <p>
        {"E-mail: "}
        <a href={`mailto:${controller.legalEmail}`}>{controller.legalEmail}</a>
        <br />
        {"Contact form: "}
        <a href={controller.contactUrl}>{"beastyrabbit.com/kontakt"}</a>
      </p>
    ),
  },
  {
    id: "noticeEN-3",
    title: "Note",
    content: <p>{"Moddrop is a private, non-commercial project."}</p>,
  },
  {
    id: "noticeEN-4",
    title: "Privacy",
    content: (
      <p>
        {"For information on how personal data is processed, see the "}
        <a href="/privacy">{"Privacy Policy"}</a>
        {"."}
      </p>
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
            "Personal data is not sold and not used for advertising. There is no automated decision-making, including profiling, within the meaning of Art. 22 GDPR. Embedded platforms may also process data for advertising under their own policies."
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
            "For data protection, backup copies are regularly created within the controller's own infrastructure; they are overwritten after their retention period has expired."
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
            "Pangolin also processes HTTP request logs, deleted after 14 days, and network logs, deleted after 30 days. Moddrop does not use Pangolin/Pocket-ID single sign-on."
          }
        </p>
        <p>
          {
            "The application processes technical event and error data in short-lived container logs for operation, error analysis and abuse protection. There is no central log collection. The legal basis is Art. 6(1)(f) GDPR; the legitimate interest is secure and reliable operation."
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
            "Moddrop stores account and profile data, rooms and memberships, canvas content, settings, uploaded media and related file information on the controller's own infrastructure in Germany. This enables collaboration, media delivery and access control. Room participants and authorised OBS sources receive the content needed for these purposes. Content placed in the visible stream area may be broadcast publicly."
          }
        </p>
        <p>
          {
            "The legal basis is Art. 6(1)(f) GDPR. The legitimate interest is providing the requested functions to authorised users. Data is stored for as long as you use the account, up to 10 years."
          }
        </p>
        <p>
          Account and profile data, rooms, canvas content and uploads are
          deleted on request. Please send deletion requests to{" "}
          <a href={`mailto:${controller.privacyEmail}`}>
            {controller.privacyEmail}
          </a>
          {"."} Deleting your Clerk account alone does not remove this data.
        </p>
      </>
    ),
  },
  {
    id: "privacyEN-7",
    title: "Sign-in with Clerk",
    content: (
      <>
        <p>
          {
            "We use Clerk, Inc., 660 King Street, Unit 345, San Francisco, CA 94107, USA, for sign-in. Clerk processes connection data, account data and authentication information, such as user ID, e-mail address, user name and profile picture. The browser also contacts Clerk on public pages for authentication configuration. You can optionally sign in with Discord or Twitch; identity data you authorise is then exchanged with Clerk."
          }
        </p>
        <p>
          {
            "Clerk is technically necessary for sign-in and session management (Section 25(2) no. 2 TDDDG). The legal basis for processing personal data is Art. 6(1)(f) GDPR; the legitimate interest is restricting editing to authorised users. Clerk is certified under the EU-US Data Privacy Framework; its data processing agreement also provides for Standard Contractual Clauses. The providers retain data for as long as necessary for the purposes described in their privacy policies."
          }
        </p>
        <p>
          Further information:{" "}
          <a href="https://clerk.com/legal/privacy">Clerk privacy policy</a> and{" "}
          <a href="https://clerk.com/legal/dpa">data processing agreement</a>.
        </p>
        <p>
          Discord names Discord Netherlands BV, Schiphol Boulevard 195, 1118 BG
          Schiphol, Netherlands, for people in the EEA, and Discord Inc., 444 De
          Haro Street #200, San Francisco, CA 94107, USA, for other regions.
          Discord describes Standard Contractual Clauses and the Data Privacy
          Framework for international transfers. Details:{" "}
          <a href="https://discord.com/privacy">Discord privacy policy</a>. For
          Twitch, see the following section.
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
            "Twitch and YouTube content loads when a room displays media configured by its owner. The platforms receive, in particular, IP address, browser and connection data, and information about the page and selected channel or video. They may set their own cookies and process data under their own policies."
          }
        </p>
        <p>
          {
            "Loading is necessary to provide this feature (Section 25(2) no. 2 TDDDG). The legal basis for processing personal data is Art. 6(1)(f) GDPR; the legitimate interest is the requested media display and stream output."
          }
        </p>
        <p>
          Twitch is provided by Twitch Interactive, Inc., 350 Bush Street, 2nd
          Floor, San Francisco, CA 94104, USA. Data may be transferred to the
          USA; see the{" "}
          <a href="https://legal.twitch.com/en/legal/privacy-notice/">
            Twitch privacy notice
          </a>{" "}
          for details.
        </p>
        <p>
          For users in the EEA, YouTube is provided by Google Ireland Limited,
          Gordon House, Barrow Street, Dublin 4, Ireland. Data may be
          transferred to Google LLC, 1600 Amphitheatre Parkway, Mountain View,
          CA 94043, USA. Google LLC is certified under the EU-US Data Privacy
          Framework; Google also describes Standard Contractual Clauses in its{" "}
          <a href="https://policies.google.com/privacy/frameworks">
            transfer frameworks
          </a>
          {"."} Further processing and retention follow the{" "}
          <a href="https://policies.google.com/privacy">
            Google privacy policy
          </a>
          {"."}
        </p>
      </>
    ),
  },
  {
    id: "tldraw",
    title: "tldraw editor",
    content: (
      <>
        <p>
          {
            "The canvas uses tldraw. The editor loads icons, fonts and translations from cdn.tldraw.com and makes a licence-check request. This transmits connection data and, for the licence request, licence and SDK information and the page address. Canvas content is synchronised with the controller's own backend."
          }
        </p>
        <p>
          {
            "These requests are necessary to provide the editor. The legal basis is Art. 6(1)(f) GDPR; the legitimate interest is providing the drawing feature. Section 25(2) no. 2 TDDDG applies to technically necessary local editor settings."
          }
        </p>
        <p>
          The provider is tldraw Inc., contact address Floor 3, The Arts
          Building, Morris Pl, Finsbury Park, London N4 3JG, United Kingdom.
          Data may be processed in the USA, among other countries. For details
          of processing and retention, see the{" "}
          <a href="https://www.tldraw.com/privacy.html">
            tldraw privacy policy
          </a>{" "}
          and{" "}
          <a href="https://tldraw.dev/sdk-features/license-key">
            licence information
          </a>
          {"."}
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
    id: "telemetry",
    title: "Analytics and error tracking",
    content: (
      <>
        <p>
          {
            "Umami is self-hosted on the operator's own servers in Germany. Only after consent, it measures pageviews, feature events, outbound destination hosts and web vitals, and records masked page interactions for session replay and heatmaps, subject to server sampling. Text and inputs are masked; account panels, the canvas and media are blocked. Query strings, fragments, referrers and room identifiers are removed. We do not identify your account to Umami. OBS overlays are excluded."
          }
        </p>
        <p>
          {
            "The legal basis is consent under Art. 6(1)(a) GDPR and, for access to your device, Section 25(1) TDDDG. Umami writes no cookies or entries to localStorage or sessionStorage. Analytics data is automatically deleted after 25 months, and session replays and heatmap recordings after 30 days. You can withdraw consent at any time through Cookie settings. Withdrawal saves your choice and reloads the page to stop recording. It does not affect processing before withdrawal."
          }
        </p>
        <p>
          {
            "GlitchTip is self-hosted on the operator's own servers in Germany. It receives scrubbed error reports from the browser, Next.js server and backend, including the OBS overlay. Reports contain technical errors, stack traces, release and environment information and sanitized routes. Account details, request credentials and bodies are removed. Delivery exposes connection data to the receiving server. GlitchTip writes no cookies, localStorage or sessionStorage. Reports are retained for 90 days. The legal basis is Art. 6(1)(f) GDPR; our legitimate interest is diagnosing failures and maintaining reliable operation. Error reporting operates independently of analytics consent."
          }
        </p>
        <p>
          You have the right to object to processing based on legitimate
          interests. To exercise this right, contact{" "}
          <a href={`mailto:${controller.privacyEmail}`}>
            {controller.privacyEmail}
          </a>
          .
        </p>
      </>
    ),
  },
  {
    id: "privacyEN-11",
    title: "Cookies and local storage",
    content: (
      <>
        <StorageTable language="en" />
        <p>
          {
            "Storage supports sign-in and the functions you use. Technically necessary access is based on Section 25(2) no. 2 TDDDG. Functional settings remain locally until you delete them; session data ends with the relevant session. Embedded platforms' cookies follow their own policies. You can delete local data in browser settings. This does not delete server data."
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
      <p>
        {
          "You are not obliged to provide personal data. However, the website cannot be delivered without the technically necessary connection data, and the protected areas cannot be used without signing in."
        }
      </p>
    ),
  },
  {
    id: "privacyEN-14",
    title: "Changes",
    content: (
      <p>
        {
          "This privacy policy is updated when the website or the legal situation changes. The version published here applies."
        }
      </p>
    ),
  },
];
