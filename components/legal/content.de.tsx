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
            "Personenbezogene Daten werden nicht verkauft und nicht für Werbung verwendet. Eine automatisierte Entscheidungsfindung einschließlich Profiling im Sinne von Art. 22 DSGVO findet nicht statt. Nach dem Laden eingebundener Twitch- oder YouTube-Inhalte können die Plattformen Daten für eigene Werbung verarbeiten, wie im Abschnitt zu Einbettungen beschrieben."
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
            "Moddrop läuft auf eigener Server-Infrastruktur des Verantwortlichen in Deutschland. Aufrufe aus dem Internet erreichen die Anwendung über einen Reverse-Proxy auf einem virtuellen Server der netcup GmbH, Emmy-Noether-Straße 10, 76131 Karlsruhe, Deutschland (Rechenzentrum in Nürnberg). netcup verarbeitet die Daten dabei als Auftragsverarbeiter; mit netcup besteht ein Vertrag zur Auftragsverarbeitung nach Art. 28 DSGVO. Die Verbindung ist bis zum Reverse-Proxy TLS-verschlüsselt und wird von dort durch einen verschlüsselten Tunnel an die eigene Infrastruktur weitergeleitet."
          }
        </p>
        <p>
          {
            "Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO. Das berechtigte Interesse liegt in einer sicheren und zuverlässigen Bereitstellung der Website."
          }
        </p>
        <p>
          {
            "Die folgenden Angaben zu Sicherungskopien betreffen die Datenbank, deren Longhorn-Volumes die wiederkehrenden Sicherungsaufträge der Gruppe default verwenden. Sicherungskopien werden innerhalb der eigenen Infrastruktur gespeichert und nach spätestens drei Monaten überschrieben. Für die hochgeladenen Dateien im separaten Garage-Speicher ist die Sicherungsabdeckung und deren Aufbewahrungsdauer noch zu klären."
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
            "Die Daten dienen dem Betrieb, der Fehleranalyse und der Abwehr von Angriffen und Missbrauch. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO. Das berechtigte Interesse liegt in Stabilität und Sicherheit des Angebots. Die Logfiles werden nach 14 Tagen automatisch gelöscht."
          }
        </p>
        <p>
          {
            "Pangolin verarbeitet zusätzlich HTTP-Anfrageprotokolle, die nach 14 Tagen gelöscht werden, und Netzwerkprotokolle, die nach 30 Tagen gelöscht werden. Moddrop ist öffentlich zugänglich und verwendet kein Pangolin-/Pocket-ID-SSO. Die Anwendung protokolliert Sicherheitsereignisse mit einem gekürzten IP-abgeleiteten Hash und gegebenenfalls Upload-Kennungen, abgewiesene WebSocket-Ursprünge sowie Fehlernamen und Fehlermeldungen. Ein allgemeines Protokollieren von E-Mail-Adressen oder Anfrageinhalten ist im Anwendungscode nicht eingerichtet; technische Fehlerobjekte können weitere Metadaten enthalten. Diese Daten stehen ausschließlich in kurzlebigen Kubernetes-Containerprotokollen ohne zentrale Logsammlung. Eine feste Aufbewahrungsdauer ist dafür nicht konfiguriert. Die Aufbewahrung lokaler CrowdSec-Warnungen und Sperrentscheidungen einschließlich etwaiger Sicherungen ist noch zu klären. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO, berechtigtes Interesse sind Fehlerbehebung und Missbrauchsschutz. Zur Ratenbegrenzung werden außerdem Verbindungsadressen im Arbeitsspeicher verarbeitet; inaktive Einträge können bis zur Bereinigung oder zum Neustart verbleiben."
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
            "Zwecke sind die angeforderte Zusammenarbeit, die Bereitstellung von Medien und die Zugangskontrolle. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO; das berechtigte Interesse ist die Bereitstellung dieser Funktionen für berechtigte Nutzer. Konten, Profil- und Nutzerdatensätze, Räume, Canvas-Inhalte und Uploads bleiben gespeichert, bis Sie die Daten in der Anwendung löschen, soweit dort eine Löschfunktion verfügbar ist, oder eine Löschung anfordern. Im Canvas können Sie Elemente entfernen; dies löscht nicht die zugehörigen Upload-Dateien und Metadaten. Für Konten, Nutzerdatensätze, Räume und Uploads gibt es derzeit keine Löschfunktion in Moddrop. Eine automatische Löschfrist ist nicht eingerichtet. Das Löschen des Clerk-Kontos allein entfernt die eigenen Datensätze von Moddrop nicht. Wenn Sie die Löschung anfordern, werden diese Daten manuell gelöscht. Löschanfragen richten Sie bitte an "
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
            "Zweck ist die Verwaltung von Identität und Zugang. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO; berechtigtes Interesse ist die Beschränkung der Bearbeitung auf berechtigte Nutzer. Die für Anmeldung und Sitzung benötigten Cookies und lokalen Konfigurationseinträge sind technisch erforderlich nach § 25 Abs. 2 Nr. 2 TDDDG. Clerk kann Daten in den USA und weiteren Ländern verarbeiten. Der "
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
    id: "embeds",
    title: "Twitch- und YouTube-Einbettungen",
    content: (
      <>
        <p>
          {
            "In der Steuerungsoberfläche werden Twitch- und YouTube-Player erst geladen, wenn Sie ausdrücklich auf „Load Twitch player“ beziehungsweise „Load YouTube video“ klicken. Vorher werden keine Skripte oder Player dieser Einbettungen geladen. Nach dem Klick lädt der Browser für Twitch embed.twitch.tv/embed/v1.js und für YouTube www.youtube.com/iframe_api sowie die jeweiligen Player. Die Plattformen erhalten insbesondere IP-Adresse, Browser-/Verbindungsdaten, die aufgerufene Seite und die Kanal- oder Videoauswahl. Sie können Cookies einsetzen und Nutzungsdaten für eigene Zwecke einschließlich Werbung verarbeiten. Inhalte können auch ohne Ton automatisch abspielen."
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
            "Mit dem Klick willigen Sie in das Laden der gewählten Einbettung ein. Rechtsgrundlagen sind § 25 Abs. 1 TDDDG und Art. 6 Abs. 1 lit. a DSGVO. Die Entscheidung wird nur im Arbeitsspeicher dieser Seite gehalten, nicht dauerhaft im Browser gespeichert. Durch Neuladen können Sie die Einwilligung für weiteres Laden widerrufen; zuvor von den Plattformen gesetzte Cookies können Sie in den Browsereinstellungen löschen. Der Widerruf berührt die Rechtmäßigkeit der bisherigen Verarbeitung nicht. Die OBS-Browserquelle lädt die vom Raumeigentümer konfigurierte Ausgabe weiterhin automatisch. Dies ist für die Bereitstellung dieser Ausgabe erforderlich; Rechtsgrundlagen sind § 25 Abs. 2 Nr. 2 TDDDG und Art. 6 Abs. 1 lit. f DSGVO mit dem berechtigten Interesse an der angeforderten Streamausgabe. Die YouTube-Raumeinstellung gilt zusätzlich: Bei deaktiviertem YouTube wird kein Player geladen, und die Ausgabe in OBS setzt weiterhin die Freigabe allow_on_air samt Risikobestätigung durch den Eigentümer voraus. Diese Bestätigung ersetzt nicht die Einwilligung eines Nutzers in der Steuerungsoberfläche. Die konkreten Plattform-Cookies und ihre Fristen sowie Twitch-Übermittlungsgarantien sind noch zu klären."
          }
        </p>
      </>
    ),
  },
  {
    id: "tldraw-licence",
    title: "tldraw-Lizenzprüfung",
    content: (
      <>
        <p>
          Der Canvas verwendet die tldraw-Bibliothek. Symbole, Schriften und
          Übersetzungen werden mit Moddrop selbst bereitgestellt; die Zeichnung
          wird mit dem eigenen Backend synchronisiert. Die derzeitige
          Produktivlizenz ist gültig, aktiviert jedoch eine
          Wasserzeichen-Anfrage an cdn.tldraw.com. Dabei werden
          Verbindungsdaten, Lizenzkennung, Lizenztyp, SDK-Version und die
          vollständige Seitenadresse übermittelt. Die Lizenzsignatur wird lokal
          geprüft.
        </p>
        <p>
          Die aktuelle öffentliche Datenschutzerklärung nennt tldraw Inc. mit
          der Kontaktanschrift Floor 3, The Arts Building, Morris Pl, Finsbury
          Park, London N4 3JG, Vereinigtes Königreich, und eine Verarbeitung
          unter anderem in den USA. Die Erforderlichkeit und Rechtsgrundlage
          dieser zusätzlichen Anfrage, die Anwendbarkeit der Erklärung auf
          SDK-Berichte sowie Speicherfristen und Übermittlungsgarantien sind
          noch zu klären. Weitere Informationen:{" "}
          <a href="https://tldraw.dev/sdk-features/license-key">
            tldraw-Lizenzinformationen
          </a>{" "}
          und{" "}
          <a href="https://www.tldraw.com/privacy.html">Datenschutzerklärung</a>
          .
        </p>
      </>
    ),
  },
  {
    id: "privacyDE-10",
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
    id: "privacyDE-11",
    title: "Cookies und lokale Speicherung",
    content: (
      <>
        {" "}
        <StorageTable language="de" />
        <p>
          {
            "Für die Anmeldung und Sitzungsverwaltung sind die Clerk-Cookies __client_uat und __client_uat_<suffix> mit rund 400 Tagen Laufzeit und der localStorage-Eintrag __clerk_environment ohne automatische Browser-Ablauffrist technisch erforderlich (§ 25 Abs. 2 Nr. 2 TDDDG). Die ersten beiden Cookie-Namen und die Konfiguration wurden ohne Anmeldung beobachtet. Clerk dokumentiert außerdem __session auf der Anwendungsdomain mit 60 Sekunden Tokenlaufzeit und __client auf clerk.moddrop.live mit browserabhängiger Laufzeit für angemeldete Nutzer. Diese Sitzungscookies wurden anhand der offiziellen Dokumentation geprüft, nicht in einer angemeldeten Sitzung beobachtet."
          }
        </p>
        <p>
          {
            "Moddrop verwendet sessionStorage unter moddrop:obsSetupSecret:<roomId> zur einmaligen Übergabe des OBS-Zugangsschlüssels. localStorage unter moddrop:media-preferences:v1:<userId>:<roomId> speichert Lautstärke und Stummschaltung. Die selbst eingebundene Editor-Bibliothek schreibt TLDRAW_USER_DATA_v3 in localStorage und TLDRAW_TAB_ID_v2 in sessionStorage als Erstanbieterspeicher. Editor-Assets werden von Moddrop selbst bereitgestellt. Diese Einträge wurden aus dem Code ermittelt. Auf öffentlichen Seiten waren sessionStorage und IndexedDB bei der Prüfung leer; eine zusätzliche lokale Canvas-Datenbank ist nicht konfiguriert."
          }
        </p>
        <p>
          {
            "Für technisch erforderliche Speicherzugriffe gilt § 25 Abs. 2 Nr. 2 TDDDG. Die Erforderlichkeit dauerhafter Präferenzspeicherung ist noch zu klären. Nicht erforderliche Zugriffe erfordern eine Einwilligung nach § 25 Abs. 1 TDDDG; bei personenbezogenen Daten gilt Art. 6 Abs. 1 lit. a DSGVO. Für die noch offenen Präferenzzugriffe ist eine Einwilligungseinholung derzeit nicht eingerichtet. Die Entscheidung zum Laden eines eingebetteten Players bleibt ausschließlich im Arbeitsspeicher. Sie können lokale Daten in den Browsereinstellungen löschen. Dies löscht keine Daten auf den Servern."
          }
        </p>
      </>
    ),
  },
  {
    id: "privacyDE-12",
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
    id: "privacyDE-13",
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
    id: "privacyDE-14",
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
