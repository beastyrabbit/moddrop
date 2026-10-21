import { ControllerAddress, controller } from "./controller";
import type { LegalSection } from "./legal-document";
import { StorageTable } from "./storage-table";

export const noticeDE: readonly LegalSection[] = [
  {
    id: "noticeDE-1",
    title: "Anbieter",
    content: <ControllerAddress language="de" />,
  },
  {
    id: "noticeDE-2",
    title: "Kontakt",
    content: (
      <p>
        {"E-Mail: "}
        <a href={`mailto:${controller.legalEmail}`}>{controller.legalEmail}</a>
        <br />
        {"Kontaktformular: "}
        <a href={controller.contactUrl}>{"beastyrabbit.com/kontakt"}</a>
      </p>
    ),
  },
  {
    id: "noticeDE-3",
    title: "Hinweis",
    content: <p>{"Moddrop ist ein privates, nicht-kommerzielles Projekt."}</p>,
  },
  {
    id: "noticeDE-4",
    title: "Datenschutz",
    content: (
      <p>
        {
          "Informationen zur Verarbeitung personenbezogener Daten finden Sie in der "
        }
        <a href="/datenschutz">{"Datenschutzerklärung"}</a>
        {"."}
      </p>
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
            "Personenbezogene Daten werden nicht verkauft und nicht für Werbung verwendet. Eine automatisierte Entscheidungsfindung einschließlich Profiling im Sinne von Art. 22 DSGVO findet nicht statt. Eingebettete Plattformen können Daten nach ihren eigenen Richtlinien auch für Werbung verarbeiten."
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
            "Zur Datensicherung werden regelmäßig Sicherungskopien innerhalb der eigenen Infrastruktur erstellt; sie werden nach Ablauf ihrer Aufbewahrungszeit überschrieben."
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
            "Pangolin verarbeitet zusätzlich HTTP-Anfrageprotokolle, die nach 14 Tagen gelöscht werden, und Netzwerkprotokolle, die nach 30 Tagen gelöscht werden. Moddrop verwendet kein Pangolin-/Pocket-ID-SSO."
          }
        </p>
        <p>
          {
            "Für Betrieb, Fehleranalyse und Missbrauchsschutz verarbeitet die Anwendung technische Ereignis- und Fehlerdaten in kurzlebigen Containerprotokollen. Eine zentrale Logsammlung gibt es nicht. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO; das berechtigte Interesse liegt im sicheren und zuverlässigen Betrieb."
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
            "Moddrop speichert Konten- und Profildaten, Räume und Mitgliedschaften, Canvas-Inhalte, Einstellungen sowie hochgeladene Medien und zugehörige Dateiinformationen auf eigener Infrastruktur in Deutschland. Dies ermöglicht die gemeinsame Bearbeitung, die Medienbereitstellung und die Zugangskontrolle. Raumteilnehmer und berechtigte OBS-Quellen erhalten die dafür erforderlichen Inhalte. Inhalte im sichtbaren Streambereich können öffentlich ausgestrahlt werden."
          }
        </p>
        <p>
          {
            "Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO. Das berechtigte Interesse ist die Bereitstellung der angeforderten Funktionen für berechtigte Nutzer. Die Daten werden gespeichert, solange Sie das Konto nutzen, längstens bis zu 10 Jahre."
          }
        </p>
        <p>
          Auf Anfrage werden Konten- und Profildaten, Räume, Canvas-Inhalte und
          Uploads gelöscht. Löschanfragen richten Sie bitte an{" "}
          <a href={`mailto:${controller.privacyEmail}`}>
            {controller.privacyEmail}
          </a>
          {"."} Das Löschen des Clerk-Kontos allein entfernt diese Daten nicht.
        </p>
      </>
    ),
  },
  {
    id: "privacyDE-7",
    title: "Anmeldung mit Clerk",
    content: (
      <>
        <p>
          {
            "Für die Anmeldung verwenden wir Clerk, Inc., 660 King Street, Unit 345, San Francisco, CA 94107, USA. Clerk verarbeitet Verbindungsdaten, Kontodaten und Anmeldeinformationen, etwa Nutzerkennung, E-Mail-Adresse, Benutzername und Profilbild. Der Browser kontaktiert Clerk auch auf öffentlichen Seiten für die Anmeldekonfiguration. Optional können Sie sich über Discord oder Twitch anmelden; dabei werden die von Ihnen freigegebenen Identitätsdaten mit Clerk ausgetauscht."
          }
        </p>
        <p>
          {
            "Clerk ist für die Anmeldung und Sitzungsverwaltung technisch notwendig (§ 25 Abs. 2 Nr. 2 TDDDG). Rechtsgrundlage der Datenverarbeitung ist Art. 6 Abs. 1 lit. f DSGVO; berechtigtes Interesse ist die Beschränkung der Bearbeitung auf berechtigte Nutzer. Clerk ist unter dem EU-US Data Privacy Framework zertifiziert; der Auftragsverarbeitungsvertrag sieht ergänzend Standardvertragsklauseln vor. Die Anbieter speichern Daten, solange dies für die in ihren Datenschutzerklärungen beschriebenen Zwecke erforderlich ist."
          }
        </p>
        <p>
          Weitere Informationen:{" "}
          <a href="https://clerk.com/legal/privacy">
            Clerk-Datenschutzerklärung
          </a>{" "}
          und{" "}
          <a href="https://clerk.com/legal/dpa">Auftragsverarbeitungsvertrag</a>
          {"."}
        </p>
        <p>
          Discord nennt für Personen im EWR die Discord Netherlands BV, Schiphol
          Boulevard 195, 1118 BG Schiphol, Niederlande, und für andere Regionen
          Discord Inc., 444 De Haro Street #200, San Francisco, CA 94107, USA.
          Discord beschreibt Standardvertragsklauseln und das Data Privacy
          Framework für internationale Übermittlungen. Details:{" "}
          <a href="https://discord.com/privacy">Discord-Datenschutzerklärung</a>
          {"."} Für Twitch gelten die Angaben im folgenden Abschnitt.
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
            "Twitch- und YouTube-Inhalte werden geladen, wenn ein Raum vom Raumeigentümer konfigurierte Medien anzeigt. Die Plattformen erhalten dabei insbesondere IP-Adresse, Browser- und Verbindungsdaten sowie Angaben zur aufgerufenen Seite und zum ausgewählten Kanal oder Video. Sie können eigene Cookies setzen und Daten nach ihren eigenen Richtlinien verarbeiten."
          }
        </p>
        <p>
          {
            "Das Laden ist zur Bereitstellung dieser Funktion erforderlich (§ 25 Abs. 2 Nr. 2 TDDDG). Rechtsgrundlage der Datenverarbeitung ist Art. 6 Abs. 1 lit. f DSGVO; berechtigtes Interesse ist die angeforderte Medienanzeige und Streamausgabe."
          }
        </p>
        <p>
          Twitch wird von Twitch Interactive, Inc., 350 Bush Street, 2nd Floor,
          San Francisco, CA 94104, USA, angeboten. Daten können in die USA
          übermittelt werden; Einzelheiten in der{" "}
          <a href="https://legal.twitch.com/en/legal/privacy-notice/">
            Datenschutzerklärung von Twitch
          </a>
          {"."}
        </p>
        <p>
          Für YouTube ist bei Nutzern im EWR Google Ireland Limited, Gordon
          House, Barrow Street, Dublin 4, Irland, verantwortlich. Daten können
          an Google LLC, 1600 Amphitheatre Parkway, Mountain View, CA 94043,
          USA, übermittelt werden. Google LLC ist unter dem EU-US Data Privacy
          Framework zertifiziert; Google beschreibt ergänzend
          Standardvertragsklauseln in seinen{" "}
          <a href="https://policies.google.com/privacy/frameworks">
            Übermittlungsregeln
          </a>
          {"."} Weitere Verarbeitung und Aufbewahrung richten sich nach der{" "}
          <a href="https://policies.google.com/privacy">
            Google-Datenschutzerklärung
          </a>
          {"."}
        </p>
      </>
    ),
  },
  {
    id: "tldraw",
    title: "tldraw-Editor",
    content: (
      <>
        <p>
          {
            "Der Canvas verwendet tldraw. Der Editor lädt Symbole, Schriften und Übersetzungen von cdn.tldraw.com und stellt eine Anfrage zur Lizenzprüfung. Dabei werden Verbindungsdaten sowie bei der Lizenzanfrage Lizenz- und SDK-Angaben und die Seitenadresse übermittelt. Die Canvas-Inhalte werden mit dem eigenen Backend synchronisiert."
          }
        </p>
        <p>
          {
            "Diese Anfragen sind zur Bereitstellung des Editors erforderlich. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO; das berechtigte Interesse liegt in der Bereitstellung der Zeichenfunktion. Für technisch notwendige lokale Editor-Einstellungen gilt § 25 Abs. 2 Nr. 2 TDDDG."
          }
        </p>
        <p>
          Anbieter ist tldraw Inc., Kontaktanschrift Floor 3, The Arts Building,
          Morris Pl, Finsbury Park, London N4 3JG, Vereinigtes Königreich. Daten
          können unter anderem in den USA verarbeitet werden. Einzelheiten zur
          Verarbeitung und Aufbewahrung finden Sie in der{" "}
          <a href="https://www.tldraw.com/privacy.html">
            Datenschutzerklärung von tldraw
          </a>{" "}
          und den{" "}
          <a href="https://tldraw.dev/sdk-features/license-key">
            Lizenzinformationen
          </a>
          {"."}
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
    id: "telemetry",
    title: "Reichweitenmessung und Fehlerberichte",
    content: (
      <>
        <p>
          {
            "Umami wird auf eigenen Servern des Betreibers in Deutschland betrieben. Erst nach Ihrer Einwilligung erfasst es Seitenaufrufe, Funktionsereignisse, Hostnamen ausgehender Links und Web Vitals sowie maskierte Seiteninteraktionen für Sitzungsaufzeichnungen und Heatmaps, abhängig von der serverseitigen Stichprobe. Texte und Eingaben werden maskiert; Kontobereiche, Canvas und Medien werden gesperrt. URL-Parameter, Fragmente, Referrer und Raumkennungen werden entfernt. Ihr Konto wird Umami gegenüber nicht identifiziert. OBS-Overlays sind ausgenommen."
          }
        </p>
        <p>
          {
            "Rechtsgrundlage ist Ihre Einwilligung nach Art. 6 Abs. 1 lit. a DSGVO und für Zugriffe auf Ihr Endgerät § 25 Abs. 1 TDDDG. Umami schreibt keine Cookies und keine Einträge in localStorage oder sessionStorage. Analysedaten werden nach 25 Monaten, Sitzungsaufzeichnungen und Heatmap-Daten nach 30 Tagen automatisch gelöscht. Sie können Ihre Einwilligung jederzeit über Cookie-Einstellungen widerrufen. Dabei wird Ihre Auswahl gespeichert und die Seite neu geladen, um die Aufzeichnung zu beenden. Die Verarbeitung vor dem Widerruf bleibt unberührt."
          }
        </p>
        <p>
          {
            "GlitchTip wird auf eigenen Servern des Betreibers in Deutschland betrieben. Es empfängt bereinigte Fehlerberichte aus Browser, Next.js-Server und Backend einschließlich des OBS-Overlays. Die Berichte enthalten technische Fehler, Stacktraces, Release- und Umgebungsangaben sowie bereinigte Routen. Kontodaten, Zugangsdaten und Anfrageinhalte werden entfernt. Bei der Übertragung erhält der empfangende Server Verbindungsdaten. GlitchTip schreibt keine Cookies und nutzt weder localStorage noch sessionStorage. Die Aufbewahrungsfrist beträgt 90 Tage. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO; unser berechtigtes Interesse ist die Fehlerdiagnose und ein zuverlässiger Betrieb. Fehlerberichte erfolgen unabhängig von der Analyse-Einwilligung."
          }
        </p>
        <p>
          Sie haben ein Widerspruchsrecht bei Verarbeitungen auf Grundlage
          berechtigter Interessen. Wenden Sie sich dazu an{" "}
          <a href={`mailto:${controller.privacyEmail}`}>
            {controller.privacyEmail}
          </a>
          .
        </p>
      </>
    ),
  },
  {
    id: "privacyDE-11",
    title: "Cookies und lokale Speicherung",
    content: (
      <>
        <StorageTable language="de" />
        <p>
          {
            "Die Speicherung dient der Anmeldung und den von Ihnen genutzten Funktionen. Technisch notwendige Zugriffe erfolgen nach § 25 Abs. 2 Nr. 2 TDDDG. Funktionale Einstellungen bleiben lokal, bis Sie sie löschen; Sitzungsdaten enden mit der jeweiligen Sitzung. Für Cookies eingebetteter Plattformen gelten deren eigene Richtlinien. Sie können lokale Daten in den Browsereinstellungen löschen. Dies löscht keine Daten auf den Servern."
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
      <p>
        {
          "Sie sind nicht verpflichtet, personenbezogene Daten bereitzustellen. Ohne die technisch notwendigen Verbindungsdaten kann die Website jedoch nicht ausgeliefert werden, und ohne Anmeldung sind die geschützten Bereiche nicht nutzbar."
        }
      </p>
    ),
  },
  {
    id: "privacyDE-14",
    title: "Änderungen",
    content: (
      <p>
        {
          "Diese Datenschutzerklärung wird angepasst, wenn sich die Website oder die Rechtslage ändert. Es gilt die jeweils hier veröffentlichte Fassung."
        }
      </p>
    ),
  },
];
