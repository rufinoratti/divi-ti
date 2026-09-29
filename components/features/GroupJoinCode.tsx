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
    <section className="mt-7 rounded-[30px] border border-[#e7e7e7] p-6" aria-labelledby="group-join-code-title">
      <div className="flex items-center gap-3 text-[#594ff4]">
        <UsersRoundIcon aria-hidden="true" size={22} strokeWidth={1.8} />
        <h2 id="group-join-code-title" className="text-lg font-bold tracking-[-0.03em] text-[#1f1f1f]">
          Código para unirse
        </h2>
      </div>
      <p className="mt-2 text-sm leading-6 text-[#5d5d5d]">
        Compartilo para que tus compañeros se sumen a {groupName}.
      </p>

      <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl bg-[#f6f6f6] p-3">
        <code className="select-all font-mono text-lg font-bold tracking-[0.12em] text-[#1f1f1f] sm:text-xl">
          {formattedCode}
        </code>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full bg-white px-3 text-xs font-bold text-[#594ff4] transition active:scale-[0.97]"
          aria-label="Copiar código del grupo"
        >
          {copyMessage === 'Código copiado'
            ? <CheckIcon aria-hidden="true" size={15} />
            : <CopyIcon aria-hidden="true" size={15} />}
          {copyMessage === 'Código copiado' ? 'Copiado' : 'Copiar'}
        </button>
      </div>
      {copyMessage && <p role="status" className="mt-2 text-sm text-[#5d5d5d]">{copyMessage}</p>}
      <p className="mt-3 text-xs leading-5 text-[#888888]">
        Es reutilizable: todas las personas con este código pueden unirse al grupo.
      </p>
    </section>
  );
}
