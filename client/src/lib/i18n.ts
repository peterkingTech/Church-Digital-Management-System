import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      "dashboard": "Dashboard",
      "attendance": "Attendance",
      "tasks": "Tasks",
      "announcements": "Announcements",
      "members": "Members",
      "settings": "Settings",
      "reports": "Reports",
      "welcome": "Welcome back",
      "signIn": "Sign In",
      "signOut": "Sign Out",
      "email": "Email",
      "password": "Password",
      "stats": {
        "totalMembers": "Total Members",
        "weeklyAttendance": "Weekly Attendance",
        "pendingTasks": "Pending Tasks",
        "giving": "Monthly Giving"
      },
      "roles": {
        "pastor": "Pastor",
        "admin": "Admin",
        "worker": "Worker",
        "member": "Member",
        "guest": "Guest"
      }
    }
  },
  es: {
    translation: {
      "dashboard": "Panel",
      "attendance": "Asistencia",
      "tasks": "Tareas",
      "announcements": "Anuncios",
      "members": "Miembros",
      "settings": "Configuraci\u00f3n",
      "reports": "Informes",
      "welcome": "Bienvenido de nuevo",
      "signIn": "Iniciar Sesi\u00f3n",
      "signOut": "Cerrar Sesi\u00f3n",
      "email": "Correo electr\u00f3nico",
      "password": "Contrase\u00f1a",
      "stats": {
        "totalMembers": "Miembros Totales",
        "weeklyAttendance": "Asistencia Semanal",
        "pendingTasks": "Tareas Pendientes",
        "giving": "Ofrenda Mensual"
      },
      "roles": {
        "pastor": "Pastor",
        "admin": "Administrador",
        "worker": "Trabajador",
        "member": "Miembro",
        "guest": "Invitado"
      }
    }
  },
  de: {
    translation: {
      "dashboard": "Dashboard",
      "attendance": "Anwesenheit",
      "tasks": "Aufgaben",
      "announcements": "Ank\u00fcndigungen",
      "members": "Mitglieder",
      "settings": "Einstellungen",
      "reports": "Berichte",
      "welcome": "Willkommen zur\u00fcck",
      "signIn": "Anmelden",
      "signOut": "Abmelden",
      "email": "E-Mail",
      "password": "Passwort",
      "stats": {
        "totalMembers": "Gesamtmitglieder",
        "weeklyAttendance": "W\u00f6chentliche Anwesenheit",
        "pendingTasks": "Ausstehende Aufgaben",
        "giving": "Monatliche Spenden"
      },
      "roles": {
        "pastor": "Pastor",
        "admin": "Administrator",
        "worker": "Mitarbeiter",
        "member": "Mitglied",
        "guest": "Gast"
      }
    }
  },
  fr: {
    translation: {
      "dashboard": "Tableau de bord",
      "attendance": "Pr\u00e9sence",
      "tasks": "T\u00e2ches",
      "announcements": "Annonces",
      "members": "Membres",
      "settings": "Param\u00e8tres",
      "reports": "Rapports",
      "welcome": "Bon retour",
      "signIn": "Se connecter",
      "signOut": "Se d\u00e9connecter",
      "email": "E-mail",
      "password": "Mot de passe",
      "stats": {
        "totalMembers": "Membres totaux",
        "weeklyAttendance": "Pr\u00e9sence hebdomadaire",
        "pendingTasks": "T\u00e2ches en attente",
        "giving": "Offrandes mensuelles"
      },
      "roles": {
        "pastor": "Pasteur",
        "admin": "Administrateur",
        "worker": "Ouvrier",
        "member": "Membre",
        "guest": "Invite"
      }
    }
  },
  pt: {
    translation: {
      "dashboard": "Painel",
      "attendance": "Presen\u00e7a",
      "tasks": "Tarefas",
      "announcements": "An\u00fancios",
      "members": "Membros",
      "settings": "Configura\u00e7\u00f5es",
      "reports": "Relat\u00f3rios",
      "welcome": "Bem-vindo de volta",
      "signIn": "Entrar",
      "signOut": "Sair",
      "email": "E-mail",
      "password": "Senha",
      "stats": {
        "totalMembers": "Total de Membros",
        "weeklyAttendance": "Presen\u00e7a Semanal",
        "pendingTasks": "Tarefas Pendentes",
        "giving": "Ofertas Mensais"
      },
      "roles": {
        "pastor": "Pastor",
        "admin": "Administrador",
        "worker": "Obreiro",
        "member": "Membro",
        "guest": "Convidado"
      }
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "en", 
    fallbackLng: "en",
    interpolation: {
      escapeValue: false 
    }
  });

export default i18n;
