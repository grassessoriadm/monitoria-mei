import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { buildSeedData } from "./seed";
import { competenciaAtual, formatCompetencia } from "./format";
import { LIMITE_MEI_PADRAO, garantirFaturamentos } from "./faturamento";
import type { DB, Session, Usuario } from "./types";


const STORE_KEY = "mei_monitor_db_v2";
const AUTH_KEY = "mei_monitor_auth_v1";
const USERS_KEY = "mei_monitor_users_v1";

const DEMO_USERS: Usuario[] = [{ email: "gestao@mei.com", senha: "demo123", nome: "GR Assessoria" }];

export function loadUsers(): Usuario[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (raw) return JSON.parse(raw) as Usuario[];
  } catch {
    /* ignore */
  }
  const inicial = DEMO_USERS.map((u) => ({ ...u }));
  localStorage.setItem(USERS_KEY, JSON.stringify(inicial));
  return inicial;
}

export function saveUsers(users: Usuario[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function loadDB(): DB {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const db = JSON.parse(raw) as DB;
      db.guias ??= [];
      db.clientes ??= [];
      db.parcelamentos ??= [];
      db.monitoramentos ??= [];
      db.competencias ??= [];
      db.monitoramentos.forEach((m) => {
        m.dados_checklist ??= {};
        m.checklist ??= {};
      });
      const cur = competenciaAtual();
      if (!db.competencias.some((c) => c.competencia === cur)) {
        db.competencias.forEach((c) => (c.atual = false));
        db.competencias.push({ id: "c-" + cur, competencia: cur, referencia: formatCompetencia(cur), atual: true });
      }
      // Garante planilha de faturamento para todo cliente + virada automática de ano
      garantirFaturamentos(db);
      localStorage.setItem(STORE_KEY, JSON.stringify(db));
      return db;
    }
  } catch {
    /* ignore */
  }
  const seed = buildSeedData();
  localStorage.setItem(STORE_KEY, JSON.stringify(seed));
  return seed;
}

interface StoreValue {
  ready: boolean;
  db: DB;
  session: Session | null;
  comp: string;
  setComp: (c: string) => void;
  update: (fn: (db: DB) => void) => void;
  login: (email: string, senha: string) => boolean;
  logout: () => void;
}

const EMPTY_DB: DB = {
  competencias: [],
  clientes: [],
  monitoramentos: [],
  parcelamentos: [],
  guias: [],
  faturamentos: [],
  config: { limite_anual_mei: LIMITE_MEI_PADRAO },
};

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [db, setDb] = useState<DB>(EMPTY_DB);
  const [session, setSession] = useState<Session | null>(null);
  const [comp, setComp] = useState<string>(competenciaAtual());

  useEffect(() => {
    const loaded = loadDB();
    setDb(loaded);
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      if (raw) setSession(JSON.parse(raw) as Session);
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  const update = useCallback((fn: (draft: DB) => void) => {
    setDb((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as DB;
      fn(next);
      // Invariante do sistema: nenhum cliente sem planilha, cálculos sempre sincronizados
      garantirFaturamentos(next);
      localStorage.setItem(STORE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);


  const login = useCallback((email: string, senha: string) => {
    const user = loadUsers().find((u) => u.email === email && u.senha === senha);
    if (!user) return false;
    const s = { email: user.email, nome: user.nome };
    localStorage.setItem(AUTH_KEY, JSON.stringify(s));
    setSession(s);
    return true;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_KEY);
    setSession(null);
  }, []);

  const value = useMemo<StoreValue>(
    () => ({ ready, db, session, comp, setComp, update, login, logout }),
    [ready, db, session, comp, update, login, logout],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore precisa estar dentro de StoreProvider");
  return ctx;
}