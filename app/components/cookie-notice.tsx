"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const NOTICE_KEY = "eltaulell_cookie_notice_v1";

export default function CookieNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(window.localStorage.getItem(NOTICE_KEY) !== "acknowledged");
  }, []);

  function acknowledge() {
    window.localStorage.setItem(NOTICE_KEY, "acknowledged");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <aside className="cookie-notice" aria-label="Avís de galetes de seguretat">
      <div>
        <strong>Galetes tècniques i de seguretat</strong>
        <p>
          El Taulell només utilitza les galetes imprescindibles per iniciar
          sessió, protegir l&apos;accés i connectar serveis autoritzats. No fem
          seguiment publicitari.
        </p>
      </div>
      <div className="cookie-notice-actions">
        <Link href="/cookies">Més informació</Link>
        <button onClick={acknowledge} type="button">Entès</button>
      </div>
    </aside>
  );
}
