import { ControllerAddress, controller } from "./controller";
import type { LegalSection } from "./legal-document";
import { StorageTable } from "./storage-table";

export const noticeDE: readonly LegalSection[] = [
  {
    id: "noticeDE-1",
    title: "Anbieter",
    content: (
      <>
        <ControllerAddress language="de" />
      </>
    ),
  },
  {
    id: "noticeDE-2",
    title: "Kontakt",
    content: (
      <>
        <p>
          {"E-Mail: "}
          <a href={`mailto:${controller.legalEmail}`}>
            {controller.legalEmail}
          </a>
          {"\nKontaktformular: "}
          <a href={controller.contactUrl}>{"beastyrabbit.com/kontakt"}</a>
        </p>
      </>
    ),
  },
  {
    id: "noticeDE-3",
    title: "Hinweis",
    content: (
      <>
        <p>{"Moddrop ist ein privates, nicht-kommerzielles Projekt."}</p>
      </>
    ),
  },
  {
    id: "noticeDE-4",
    title: "Datenschutz",
    content: (
      <>
        <p>
          {
            "Informationen zur Verarbeitung personenbezogener Daten finden Sie in der "
          }
          <a href="/datenschutz">{"Datenschutzerklärung"}</a>
          {"."}
        </p>
      </>
    ),
  },
];

export const privacyDE: readonly LegalSection[] = [
  {
    id: "privacyDE-1",
    title: "Verantwortlicher",
    content: (
      <>
        <p>
          {
            "Verantwortlich für die Verarbeitung personenbezogener Daten auf https://moddrop.live ist:"
          }
        </p>
        <ControllerAddress language="de" />
        <p>
          {"E-Mail: "}
          <a href={`mailto:${controller.privacyEmail}`}>
            {controller.privacyEmail}
          </a>
        </p>
        <p>
          {
            "Ein Datenschutzbeauftragter ist nicht bestellt, da hierzu keine gesetzliche Pflicht besteht."
          }
        </p>
      </>
    ),
  },
  {
    id: "privacyDE-2",
    title: "Überblick",
    content: (
      <>
        <p>
          {
            "Diese Erklärung informiert darüber, welche personenbezogenen Daten bei der Nutzung von Moddrop verarbeitet werden, zu welchen Zwecken, auf welcher Rechtsgrundlage und wie lange. Moddrop ist ein privates, nicht-kommerzielles Projekt. Moddrop stellt Streamern und Moderatoren eine gemeinsame Zeichenfläche für Live-Overlays in OBS bereit."
          }
        </p>
        <p>
          {
            "Moddrop verkauft personenbezogene Daten nicht und verwendet sie nicht für eigene Werbung. Eingebundene Plattformen können Daten für eigene Werbung verarbeiten, wie im Abschnitt zu Twitch- und YouTube-Einbettungen beschrieben. Eine automatisierte Entscheidungsfindung einschließlich Profiling im Sinne von Art. 22 DSGVO findet bei Moddrop nicht statt."
          }
        </p>
      </>
    ),
  },
  {
    id: "privacyDE-3",
    title: "Hosting und Bereitstellung",
    content: (
      <>
        <p>
          {
            "Moddrop läuft auf eigener Server-Infrastruktur des Verantwortlichen in Deutschland. Aufrufe aus dem Internet erreichen die Anwendung über einen Reverse-Proxy auf einem virtuellen Server der netcup GmbH, Emmy-Noether-Straße 10, 76131 Karlsruhe, Deutschland (Rechenzentrum in Nürnberg). netcup verarbeitet die Daten dabei als Auftragsverarbeiter. Die Verbindung ist bis zum Reverse-Proxy TLS-verschlüsselt und wird von dort durch einen verschlüsselten Tunnel an die eigene Infrastruktur weitergeleitet."
          }
        </p>
        <p>
          {
            "Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO. Das berechtigte Interesse liegt in einer sicheren und zuverlässigen Bereitstellung der Website."
          }
        </p>
      </>
    ),
  },
  {
    id: "privacyDE-4",
    title: "Server-Logfiles",
    content: (
      <>
        <p>
          {
            "Bei jedem Aufruf speichert der Reverse-Proxy automatisch folgende Daten:"
          }
        </p>
        <ul>
          <li>{"IP-Adresse des anfragenden Geräts"}</li>
          <li>{"Datum und Uhrzeit des Zugriffs"}</li>
          <li>
            {
              "aufgerufene Adresse (Pfad einschließlich Parameter), HTTP-Methode und Protokoll"
            }
          </li>
          <li>{"HTTP-Statuscode, übertragene Datenmenge und Antwortzeit"}</li>
          <li>{"Browser-Kennung (User-Agent)"}</li>
          <li>{"verwendete TLS-Version und Verschlüsselung"}</li>
          <li>{"angesprochener Dienst"}</li>
        </ul>
        <p>
          {
            "Die Header Cookie und Authorization werden geschwärzt. URL-Pfade und Abfrageparameter werden protokolliert."
          }
        </p>
        <p>
          {
            "Die Daten dienen dem Betrieb, der Fehleranalyse und der Abwehr von Angriffen und Missbrauch. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO. Das berechtigte Interesse liegt in Stabilität und Sicherheit des Angebots. Die tatsächliche Löschfrist der Reverse-Proxy-Logfiles ist noch nicht abschließend bestätigt; eine Begrenzung auf 14 Tage ist vorgesehen und wird hier erst nach bestätigter Umsetzung als bestehende Frist angegeben."
          }
        </p>
        <p>
          {
            "Pangolin verarbeitet zusätzlich HTTP-Anfrage- und Netzwerkprotokolle. Die vorgesehenen Fristen von 14 beziehungsweise 30 Tagen sind noch nicht als tatsächlich umgesetzt bestätigt. Moddrop ist öffentlich zugänglich und verwendet kein Pangolin-/Pocket-ID-SSO. Die Anwendung protokolliert Sicherheitsereignisse mit einem gekürzten IP-abgeleiteten Hash und gegebenenfalls Upload-Kennungen, abgewiesene WebSocket-Ursprünge sowie Fehlernamen und Fehlermeldungen. Ein allgemeines Protokollieren von E-Mail-Adressen oder Anfrageinhalten ist im Anwendungscode nicht eingerichtet; technische Fehlerobjekte können weitere Metadaten enthalten. Diese Daten stehen in kurzlebigen Kubernetes-Containerprotokollen ohne zentrale Logsammlung. Die konkreten Löschfristen dieser Protokolle sowie lokaler CrowdSec-Warnungen und Sperrentscheidungen einschließlich etwaiger Sicherungen sind noch nicht bestätigt. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO, berechtigtes Interesse sind Fehlerbehebung und Missbrauchsschutz. Zur Ratenbegrenzung werden außerdem Verbindungsadressen im Arbeitsspeicher verarbeitet; inaktive Einträge können bis zur Bereinigung oder zum Neustart verbleiben."
          }
        </p>
      </>
    ),
  },
  {
    id: "privacyDE-5",
    title: "Schutz vor Angriffen (CrowdSec)",
    content: (
      <>
        <p>
          {
            "Zum Schutz vor Angriffen wertet die Sicherheitssoftware CrowdSec die Server-Logfiles automatisch aus und sperrt IP-Adressen, von denen erkennbar Angriffe ausgehen (zum Beispiel massenhafte Anmeldeversuche oder das Ausspähen von Schwachstellen). Erkennt CrowdSec einen Angriff, werden die IP-Adresse, der Zeitpunkt und die Art des Angriffs an die CrowdSec SAS, 20 rue Maurice Arnoux, 92120 Montrouge, Frankreich, übermittelt. CrowdSec nutzt diese Meldungen für eine gemeinsame Sperrliste, die Angriffe auf viele Server abwehrt. Bei normalem Surfen werden keine Daten an CrowdSec übermittelt."
          }
        </p>
        <p>
          {
            "Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO. Das berechtigte Interesse liegt im Schutz der Website und ihrer Nutzer vor Angriffen."
          }
        </p>
        <p>
          {
            "Für diese Verarbeitung sind der Verantwortliche und CrowdSec nach Angaben von CrowdSec gemeinsam verantwortlich (Art. 26 DSGVO): CrowdSec ist für den Betrieb seiner zentralen Dienste und Sperrlisten verantwortlich, der Verantwortliche für den Einsatz auf diesem Server. Sie können Ihre Rechte gegenüber beiden geltend machen, bei CrowdSec unter "
          }
          <a href="mailto:dpo@crowdsec.net">{"dpo@crowdsec.net"}</a>
          {
            ". CrowdSec kann die gemeldeten Daten an Mitglieder und Partner seines Netzwerks weitergeben. Übermittlungen in Länder außerhalb der EU erfolgen nach Angaben von CrowdSec auf Grundlage von Standardvertragsklauseln der EU-Kommission (Art. 46 Abs. 2 lit. c DSGVO)."
          }
        </p>
        <p>
          {
            "Vollständige IP-Adressen werden grundsätzlich höchstens drei Monate gespeichert und anschließend schrittweise verallgemeinert. Für bestimmte Angriffsanalysen und Trainingszwecke nennt CrowdSec Ausnahmen von bis zu einem Jahr vor der Anonymisierung. Details: "
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
    id: "privacyDE-6",
    title: "Nutzerkonto und Inhalte",
    content: (
      <>
        <p>
          {
            "Moddrop speichert in PostgreSQL die Clerk-Nutzerkennung, den Benutzernamen samt Suchschlüssel, die Einstellung zur Profilbildanzeige und Zeitstempel. Andere angemeldete Nutzer können Benutzernamen zur Zusammenarbeit suchen. Räume enthalten Eigentümer- und Mitgliederkennungen, einen optionalen Twitch-Kanal, YouTube-Freigabeeinstellungen samt Bestätigungszeitpunkt und einen gehashten OBS-Zugangsschlüssel. Gespeichert werden außerdem der aktuelle Canvas-Synchronisationsstand, Revisionen und Zeitstempel sowie Upload-Dateinamen, Medientyp, Größe, Objektkennung und Zeitpunkt. Die hochgeladenen Dateien liegen im eigenen S3-kompatiblen Garage-Speicher in Deutschland. Raumteilnehmer und berechtigte OBS-Quellen erhalten die für die gemeinsame Bearbeitung und Anzeige erforderlichen Inhalte. Inhalte, die Sie in den sichtbaren Streambereich legen, können im Stream öffentlich ausgestrahlt werden."
          }
        </p>
        <p>
          {
            "Zwecke sind die angeforderte Zusammenarbeit, die Bereitstellung von Medien und die Zugangskontrolle. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO; das berechtigte Interesse ist die Bereitstellung dieser Funktionen für berechtigte Nutzer. Eine automatische Löschung von Konten, Räumen, Canvas-Inhalten und Uploads ist derzeit nicht eingerichtet. Eine Löschung des Clerk-Kontos bewirkt keine nachgewiesene automatische Löschung dieser Anwendungsdaten. Löschanfragen richten Sie bitte an "
          }
          <a href={`mailto:${controller.privacyEmail}`}>
            {controller.privacyEmail}
          </a>
          {"."}
        </p>
        <p>
          {
            "Die Datenbank wird täglich durch Volume-Snapshots gesichert. Die Konfiguration löscht geplante Sicherungen nach sieben Tagen, behält aber die letzte erfolgreiche Sicherung auch länger; manuelle Sicherungen sind davon ausgenommen. Eine verbindliche maximale Aufbewahrungsdauer aller Sicherungen und eine Sicherungs-/Löschfrist für die Upload-Dateien sind noch nicht bestätigt. Kurzlebige Zugangstickets für OBS, WebSocket-Verbindungen und Upload-Abrufe begrenzen den Zugang, nicht die Speicherung der Inhalte."
          }
        </p>
      </>
    ),
  },
  {
    id: "privacyDE-7",
    title: "Clerk",
    content: (
      <>
        <p>
          {
            "Für die Anmeldung verwenden wir Clerk, Inc., 660 King Street, Unit 345, San Francisco, CA 94107, USA. Der Browser kontaktiert bereits auf öffentlichen Seiten clerk.moddrop.live für Skripte und die Anmeldekonfiguration; bei der Anmeldung können Profilbilder von img.clerk.com hinzukommen. Clerk verarbeitet Verbindungsdaten wie IP-Adresse und Browserkennung sowie bei Anmeldung Kontodaten, Nutzerkennung, E-Mail-Adresse, Benutzernamen und gegebenenfalls Profilbild. Anmeldedaten werden durch Clerk verwaltet. Der Backend-Dienst prüft Clerk-Zugangstokens und ruft bei Bedarf Nutzerprofile ab."
          }
        </p>
        <p>
          {
            "Zweck ist die Verwaltung von Identität und Zugang. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO; berechtigtes Interesse ist die Beschränkung der Bearbeitung auf berechtigte Nutzer. Die Erforderlichkeit der bereits vor einer Anmeldung geladenen Clerk-Funktionen und Speicherzugriffe wird noch geprüft. Clerk kann Daten in den USA und weiteren Ländern verarbeiten. Der "
          }
          <a href="https://clerk.com/legal/dpa">
            {"Auftragsverarbeitungsvertrag"}
          </a>
          {
            " sieht das EU-US Data Privacy Framework und ersatzweise EU-Standardvertragsklauseln vor. Clerk ist im DPF-Verzeichnis mit aktivem EU-US-Status für Nicht-Personaldaten gelistet. Clerk beschreibt eine zweckgebundene Speicherung; eine feste Frist für dieses Nutzerkonto ist nicht bestätigt. Die vertragliche Löschung innerhalb von 90 Tagen nach Ende des Dienstleistungsvertrags ist keine Zusage zur Löschung eines einzelnen Nutzerkontos. Weitere Informationen: "
          }
          <a href="https://clerk.com/legal/privacy">
            {"Clerk-Datenschutzerklärung"}
          </a>
          {"."}
        </p>
      </>
    ),
  },
  {
    id: "privacyDE-8",
    title: "Optionale Plattform-Anmeldung",
    content: (
      <>
        <p>
          {
            "Die Anmeldeoberfläche bietet optional Discord und Twitch an. Eine Verbindung zum gewählten Plattformkonto erfolgt erst, wenn Sie diese Anmeldeart auswählen. Dabei werden Verbindungsdaten und die von Ihnen bei der Plattform freigegebenen Identitätsdaten zwischen Plattform und Clerk ausgetauscht. Moddrop verwendet diese Anmeldung zur Zugangskontrolle auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO. Die konkret angeforderten Berechtigungen werden im Anmeldevorgang angezeigt; eine vollständige Prüfung dieser Berechtigungen steht noch aus."
          }
        </p>
        <p>
          {
            "Discord nennt für Personen im EWR die Discord Netherlands BV, Schiphol Boulevard 195, 1118 BG Schiphol, Niederlande, und für andere Regionen Discord Inc., 444 De Haro Street #200, San Francisco, CA 94107, USA. Discord verarbeitet auch in den USA und weiteren Ländern und nennt Standardvertragsklauseln sowie das Data Privacy Framework als Übermittlungsmechanismen. Discord ist im DPF-Verzeichnis für Nicht-Personaldaten als aktiv mit laufender Rezertifizierungsprüfung gelistet. Aufbewahrung und weitere Verarbeitung richten sich nach der "
          }
          <a href="https://discord.com/privacy">
            {"Discord-Datenschutzerklärung"}
          </a>
          {"; eine anwendungsspezifische feste Frist ist nicht bestätigt."}
        </p>
        <p>
          {
            "Twitch wird von Twitch Interactive, Inc., 350 Bush Street, 2nd Floor, San Francisco, CA 94104, USA, angeboten. Twitch nennt Verarbeitung in den USA und weiteren Ländern sowie eine Speicherung, solange sie für die beschriebenen Zwecke oder rechtliche Pflichten erforderlich ist. Ein konkreter Übermittlungsmechanismus für diese Integration ist noch nicht bestätigt. Siehe "
          }
          <a href="https://legal.twitch.com/en/legal/privacy-notice/">
            {"Twitch-Datenschutzhinweise"}
          </a>
          {"."}
        </p>
      </>
    ),
  },
  {
    id: "privacyDE-9",
    title: "Twitch- und YouTube-Einbettungen",
    content: (
      <>
        <p>
          {
            "Im Canvas kann ein Twitch-Stream eingebettet werden. Dafür lädt der Browser embed.twitch.tv/embed/v1.js und den Player. Bei YouTube-Inhalten wird die Schnittstelle www.youtube.com/iframe_api geladen; die Freigabe richtet sich zusätzlich nach der YouTube-Einstellung des Raums. Dabei erhalten die Plattformen insbesondere IP-Adresse, Browser-/Verbindungsdaten, die aufgerufene Seite und die Kanal- oder Videoauswahl. Plattformen können Cookies einsetzen und Nutzungsdaten für eigene Zwecke einschließlich Werbung verarbeiten. Twitch und Google können Inhalte auch ohne Ton automatisch abspielen."
          }
        </p>
        <p>
          {
            "Anbieter von Twitch ist das im vorigen Abschnitt genannte Unternehmen. Für YouTube ist bei Nutzern im EWR Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland, verantwortlich. Daten können an Google LLC, 1600 Amphitheatre Parkway, Mountain View, CA 94043, USA, und in weitere Länder übermittelt werden. Google beschreibt DPF und Standardvertragsklauseln in seinen "
          }
          <a href="https://policies.google.com/privacy/frameworks">
            {"Übermittlungsregeln"}
          </a>
          {
            "; Google LLC ist im DPF-Verzeichnis mit aktivem EU-US-Status gelistet. Einzelheiten zur zweckgebundenen Aufbewahrung stehen in der "
          }
          <a href="https://policies.google.com/privacy">
            {"Google-Datenschutzerklärung"}
          </a>
          {"."}
        </p>
        <p>
          {
            "Eine vorgeschaltete Einwilligungssperre für diese Einbettungen ist derzeit nicht eingerichtet. Soweit nicht erforderliche Speicherzugriffe oder Tracking stattfinden, ist eine Einwilligung nach § 25 Abs. 1 TDDDG und Art. 6 Abs. 1 lit. a DSGVO erforderlich. Eine solche Einwilligung wird durch diese Erklärung nicht eingeholt. Die Rechtsgrundlage für das bestehende automatische Laden, die eingesetzten Plattform-Cookies, deren konkrete Fristen und die Twitch-Übermittlungsgarantien müssen noch geklärt werden."
          }
        </p>
      </>
    ),
  },
  {
    id: "privacyDE-10",
    title: "tldraw",
    content: (
      <>
        <p>
          {
            "Der Canvas verwendet die tldraw-Bibliothek; die gemeinsame Zeichnung wird mit dem eigenen Backend synchronisiert. Die Standardkonfiguration lädt Editor-Assets wie Symbole, Schriften und Übersetzungen von cdn.tldraw.com. Dadurch erhält dieser Dienst Verbindungsdaten wie IP-Adresse, Browserkennung und Referrer. Die Lizenzsignatur wird lokal geprüft. Bei Evaluierungs- oder Wasserzeichenlizenzen sowie nicht lizenzierten Produktionsaufrufen kann die Bibliothek außerdem eine Wasserzeichen-Anfrage mit Lizenzkennung, Lizenztyp, SDK-Version und vollständiger Seitenadresse an diesen CDN senden. Welche dieser Bedingungen in der Produktivlizenz vorliegt, wurde nicht anhand eines Schlüssels geprüft."
          }
        </p>
        <p>
          {
            "Die Bereitstellung erforderlicher Editor-Assets dient dem Betrieb des Canvas; als berechtigtes Interesse kommt Art. 6 Abs. 1 lit. f DSGVO in Betracht. Für darüber hinausgehende Lizenz-/Nutzungsberichte ist die Erforderlichkeit und Rechtsgrundlage noch zu klären. Die aktuelle öffentliche Datenschutzerklärung nennt tldraw Inc. mit der Kontaktanschrift Floor 3, The Arts Building, Morris Pl, Finsbury Park, London N4 3JG, Vereinigtes Königreich, und eine Verarbeitung unter anderem in den USA. Ob diese Erklärung die SDK-/CDN-Verarbeitung vollständig abdeckt, deren konkrete Speicherfristen und Garantien für Drittlandübermittlungen sind noch nicht abschließend bestätigt. Siehe "
          }
          <a href="https://tldraw.dev/sdk-features/license-key">
            {"tldraw-Lizenzinformationen"}
          </a>
          {" und "}
          <a href="https://www.tldraw.com/privacy.html">Datenschutzerklärung</a>
          {
            ". Auf öffentlichen Seiten wurden bei der Prüfung keine tldraw-Anfragen beobachtet."
          }
        </p>
      </>
    ),
  },
  {
    id: "privacyDE-11",
    title: "Kontakt per E-Mail",
    content: (
      <>
        <p>
          {
            "Wenn Sie per E-Mail Kontakt aufnehmen, werden Ihre E-Mail-Adresse, der Inhalt Ihrer Nachricht und die technischen Angaben der E-Mail verarbeitet, um Ihre Anfrage zu beantworten. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO. Das berechtigte Interesse liegt darin, Anfragen beantworten zu können."
          }
        </p>
        <p>
          {
            "Die E-Mail-Postfächer werden bei der Fastmail Pty Ltd, PO Box 234, Collins Street West, VIC 8007, Australien, als Auftragsverarbeiter betrieben. Dabei können Daten in Länder außerhalb der EU übermittelt werden, insbesondere nach Australien, in die USA und nach Indien. Für diese Übermittlungen verwendet Fastmail Standardvertragsklauseln der EU-Kommission (Art. 46 Abs. 2 lit. c DSGVO). Details: "
          }
          <a href="https://www.fastmail.com/policies/privacy/">
            {"Datenschutzerklärung von Fastmail"}
          </a>
          {", "}
          <a href="https://www.fastmail.com/policies/dpa/">
            {"Auftragsverarbeitungsvertrag"}
          </a>
          {" und "}
          <a href="https://www.fastmail.com/policies/dpa/section3/">
            {"Standardvertragsklauseln"}
          </a>
          {". Eine Kopie der Garantien erhalten Sie auf Anfrage an "}
          <a href={`mailto:${controller.privacyEmail}`}>
            {controller.privacyEmail}
          </a>
          {"."}
        </p>
        <p>
          {
            "Der Verantwortliche löscht Nachrichten nach Erledigung der Anfrage, soweit keine Aufbewahrung erforderlich ist. Bei Fastmail können anschließend noch Sicherungs- und Protokolldaten nach dessen veröffentlichten Löschregeln verbleiben."
          }
        </p>
      </>
    ),
  },
  {
    id: "privacyDE-12",
    title: "Cookies und lokale Speicherung",
    content: (
      <>
        <StorageTable language="de" />
        <p>
          {
            "Bei der Prüfung ohne Anmeldung wurden die Clerk-Cookies __client_uat und __client_uat_AuaLYNYS auf .moddrop.live beobachtet. Sie markieren den Aktualisierungsstand der Anmeldung und hatten eine Ablaufzeit von rund 400 Tagen. Außerdem speichert Clerk unter __clerk_environment im localStorage eine Konfigurationskopie ohne automatische Browser-Ablauffrist. sessionStorage und IndexedDB waren bei der Prüfung der öffentlichen Seiten und des Anmeldedialogs leer. Weitere Cookies eines angemeldeten Kontos wurden nicht untersucht."
          }
        </p>
        <p>
          {
            "Der Anwendungscode verwendet außerdem sessionStorage unter moddrop:obsSetupSecret:<roomId> für die einmalige Übergabe des OBS-Zugangsschlüssels innerhalb der Tabsitzung. localStorage unter moddrop:media-preferences:v1:<userId>:<roomId> hält Lautstärke- und Stummschalteinstellungen ohne automatische Ablauffrist. Die tldraw-Bibliothek verwendet TLDRAW_USER_DATA_v3 im localStorage für Editor-Nutzerpräferenzen ohne automatische Ablauffrist und TLDRAW_TAB_ID_v2 im sessionStorage für den Tab-Zustand bis zum Ende der Tabsitzung. Diese angemeldeten Speicherzugriffe wurden aus dem Code ermittelt und nicht in einer angemeldeten Sitzung beobachtet. Der Canvas verwendet die eigene Serversynchronisation; eine zusätzliche lokale Canvas-Datenbank ist in dieser Einbindung nicht konfiguriert."
          }
        </p>
        <p>
          {
            'Für technisch erforderliche Speicherzugriffe, insbesondere die angeforderte Anmeldung und die Zugangsschlüsselübergabe, gilt § 25 Abs. 2 Nr. 2 TDDDG. Die Erforderlichkeit der Clerk-Speicherung vor einer Anmeldung und der dauerhaften Präferenzspeicherung ist noch zu klären. Nicht erforderliche Zugriffe erfordern eine Einwilligung nach § 25 Abs. 1 TDDDG; soweit dabei personenbezogene Daten verarbeitet werden, gilt Art. 6 Abs. 1 lit. a DSGVO. Eine entsprechende Einwilligungseinholung ist für die hier beschriebenen offenen Fälle derzeit nicht eingerichtet. Sie können lokale Daten in den Browsereinstellungen löschen. Dies löscht keine Daten auf den Servern. setzt keine Cookies und speichert keine Daten im Browser." Or a table of every cookie / localStorage / sessionStorage / IndexedDB entry actually set (verified in the browser): name, provider, purpose, duration, and whether it is technically necessary (§ 25 Abs. 2 Nr. 2 TDDDG) or needs consent (§ 25 Abs. 1 TDDDG, Art. 6 Abs. 1 lit. a DSGVO).]]'
          }
        </p>
      </>
    ),
  },
  {
    id: "privacyDE-13",
    title: "Ihre Rechte",
    content: (
      <>
        <p>
          {
            "Sie haben gegenüber dem Verantwortlichen folgende Rechte hinsichtlich Ihrer personenbezogenen Daten:"
          }
        </p>
        <ul>
          <li>{"Auskunft (Art. 15 DSGVO)"}</li>
          <li>{"Berichtigung (Art. 16 DSGVO)"}</li>
          <li>{"Löschung (Art. 17 DSGVO)"}</li>
          <li>{"Einschränkung der Verarbeitung (Art. 18 DSGVO)"}</li>
          <li>{"Datenübertragbarkeit (Art. 20 DSGVO)"}</li>
          <li>
            {
              "Widerruf einer erteilten Einwilligung (Art. 7 Abs. 3 DSGVO): Sie können eine erteilte Einwilligung jederzeit widerrufen. Die Rechtmäßigkeit der Verarbeitung vor dem Widerruf bleibt unberührt."
            }
          </li>
        </ul>
        <p>
          <strong>{"Widerspruchsrecht (Art. 21 DSGVO):"}</strong>
          {
            " Soweit eine Verarbeitung auf Art. 6 Abs. 1 lit. f DSGVO beruht, können Sie aus Gründen, die sich aus Ihrer besonderen Situation ergeben, jederzeit widersprechen."
          }
        </p>
        <p>
          {"Zur Ausübung Ihrer Rechte genügt eine Nachricht an "}
          <a href={`mailto:${controller.privacyEmail}`}>
            {controller.privacyEmail}
          </a>
          {"."}
        </p>
        <p>
          {
            "Sie haben außerdem das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren, insbesondere in dem Mitgliedstaat Ihres gewöhnlichen Aufenthalts, Ihres Arbeitsplatzes oder des Orts des mutmaßlichen Verstoßes (Art. 77 DSGVO)."
          }
        </p>
      </>
    ),
  },
  {
    id: "privacyDE-14",
    title: "Pflicht zur Bereitstellung",
    content: (
      <>
        <p>
          {
            "Sie sind nicht verpflichtet, personenbezogene Daten bereitzustellen. Ohne die technisch notwendigen Verbindungsdaten kann die Website jedoch nicht ausgeliefert werden, und ohne Anmeldung sind die geschützten Bereiche nicht nutzbar."
          }
        </p>
      </>
    ),
  },
  {
    id: "privacyDE-15",
    title: "Änderungen",
    content: (
      <>
        <p>
          {
            "Diese Datenschutzerklärung wird angepasst, wenn sich die Website oder die Rechtslage ändert. Es gilt die jeweils hier veröffentlichte Fassung."
          }
        </p>
      </>
    ),
  },
];
