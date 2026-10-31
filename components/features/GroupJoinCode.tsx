'use client';

import { CheckIcon, CopyIcon, UsersRoundIcon } from 'lucide-react';
import { useState } from 'react';

interface GroupJoinCodeProps {
  code: string;
  groupName: string;
}

export function formatGroupJoinCode(code: string) {
  return `${code.slice(0, 6)}-${code.slice(6)}`;
}

export function GroupJoinCode({ code, groupName }: GroupJoinCodeProps) {
  const [copyMessage, setCopyMessage] = useState('');
  const formattedCode = formatGroupJoinCode(code);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(formattedCode);
      setCopyMessage('Código copiado');
      window.setTimeout(() => setCopyMessage(''), 1800);
    } catch {
      setCopyMessage('No se pudo copiar. Seleccioná el código para copiarlo.');
    }
  }

  return (
    <section className="mt-7 rounded-[24px] border border-line p-6" aria-labelledby="group-join-code-title">
      <div className="flex items-center gap-3 text-brand">
        <UsersRoundIcon aria-hidden="true" size={22} strokeWidth={1.8} />
        <h2 id="group-join-code-title" className="text-lg font-bold tracking-[-0.03em] text-ink">
          Código para unirse
        </h2>
      </div>
      <p className="mt-2 text-sm leading-6 text-copy-muted">
        Compartilo para que tus compañeros se sumen a {groupName}.
      </p>

      <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl bg-surface p-3">
        <code className="select-all font-mono text-lg font-bold tracking-[0.12em] text-ink sm:text-xl">
          {formattedCode}
        </code>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full bg-white px-3 text-xs font-bold text-brand transition active:scale-[0.97]"
          aria-label="Copiar código del grupo"
        >
          {copyMessage === 'Código copiado'
            ? <CheckIcon aria-hidden="true" size={15} />
            : <CopyIcon aria-hidden="true" size={15} />}
          {copyMessage === 'Código copiado' ? 'Copiado' : 'Copiar'}
        </button>
      </div>
      {copyMessage && <p role="status" className="mt-2 text-sm text-copy-muted">{copyMessage}</p>}
      <p className="mt-3 text-xs leading-5 text-copy-muted">
        Es reutilizable: todas las personas con este código pueden unirse al grupo.
      </p>
    </section>
  );
}
