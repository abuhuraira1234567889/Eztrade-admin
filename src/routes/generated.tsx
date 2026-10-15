// Admin route table. Mirrors the page structure under src/pages/admin.
import { lazyImport } from "@/lib/lazy-import";

const AdminPage = lazyImport(() => import("@/pages/admin/Page"));
const AdminAnalyticsPage = lazyImport(() => import("@/pages/admin/analytics/Page"));
const AdminAnnouncementsPage = lazyImport(() => import("@/pages/admin/announcements/Page"));
const AdminRedemptionsPage = lazyImport(() => import("@/pages/admin/redemptions/Page"));
const AdminRewardsPage = lazyImport(() => import("@/pages/admin/rewards/Page"));
const AdminProductFeedbackPage = lazyImport(() => import("@/pages/admin/product-feedback/Page"));
const AdminSupportPage = lazyImport(() => import("@/pages/admin/support/Page"));
const AdminSupportThreadPage = lazyImport(() => import("@/pages/admin/support/[id]/Page"));
const AdminKnowledgeBasePage = lazyImport(() => import("@/pages/admin/knowledge-base/Page"));
const AdminCompetitionsPage = lazyImport(() => import("@/pages/admin/competitions/Page"));
const AdminCompetitionsIdPage = lazyImport(() => import("@/pages/admin/competitions/[id]/Page"));
const AdminCompetitionsNewPage = lazyImport(() => import("@/pages/admin/competitions/new/Page"));
const AdminCronsPage = lazyImport(() => import("@/pages/admin/crons/Page"));
const AdminExtensionsPage = lazyImport(() => import("@/pages/admin/extensions/Page"));
const AdminCsvImportPage = lazyImport(() => import("@/pages/admin/csv-import/Page"));
const AdminLeadsPage = lazyImport(() => import("@/pages/admin/leads/Page"));
const AdminLiveEventsPage = lazyImport(() => import("@/pages/admin/live-events/Page"));
const AdminLiveEventsSlugPage = lazyImport(() => import("@/pages/admin/live-events/[slug]/Page"));
const AdminNotificationsPage = lazyImport(() => import("@/pages/admin/notifications/Page"));
const AdminQaPage = lazyImport(() => import("@/pages/admin/qa/Page"));
const AdminQuizzesPage = lazyImport(() => import("@/pages/admin/quizzes/Page"));
const AdminQuizzesLessonPage = lazyImport(() => import("@/pages/admin/quizzes/[lesson]/Page"));
const AdminTeamPage = lazyImport(() => import("@/pages/admin/team/Page"));
const AdminTiersPage = lazyImport(() => import("@/pages/admin/tiers/Page"));
const AdminSettingsPage = lazyImport(() => import("@/pages/admin/settings/Page"));
const AdminMilestonesPage = lazyImport(() => import("@/pages/admin/milestones/Page"));
const AdminLegalPage = lazyImport(() => import("@/pages/admin/legal/Page"));
const AdminBrandContentPage = lazyImport(() => import("@/pages/admin/brand-content/Page"));
const AdminEmailTemplatesPage = lazyImport(() => import("@/pages/admin/email-templates/Page"));
const AdminImagesPage = lazyImport(() => import("@/pages/admin/images/Page"));
const AdminAcademyPage = lazyImport(() => import("@/pages/admin/academy/Page"));
const AdminAcademyIdPage = lazyImport(() => import("@/pages/admin/academy/[id]/Page"));
const AdminTradeIdeasPage = lazyImport(() => import("@/pages/admin/trade-ideas/Page"));
const AdminUsersPage = lazyImport(() => import("@/pages/admin/users/Page"));
const AdminUserDetailPage = lazyImport(() => import("@/pages/admin/users/[id]/Page"));
const AdminTelegramFeedPage = lazyImport(() => import("@/pages/admin/telegram/Page"));
const AdminTradingViewFeedPage = lazyImport(() => import("@/pages/admin/tradingview/Page"));
const AdminLeaderboardPage = lazyImport(() => import("@/pages/admin/leaderboard/Page"));

export const adminRoutes = [
  { path: "/admin", element: <AdminPage /> },
  { path: "/admin/analytics", element: <AdminAnalyticsPage /> },
  { path: "/admin/announcements", element: <AdminAnnouncementsPage /> },
  { path: "/admin/redemptions", element: <AdminRedemptionsPage /> },
  { path: "/admin/rewards", element: <AdminRewardsPage /> },
  { path: "/admin/product-feedback", element: <AdminProductFeedbackPage /> },
  { path: "/admin/knowledge-base", element: <AdminKnowledgeBasePage /> },
  { path: "/admin/support", element: <AdminSupportPage /> },
  { path: "/admin/support/:id", element: <AdminSupportThreadPage /> },
  { path: "/admin/competitions", element: <AdminCompetitionsPage /> },
  { path: "/admin/leaderboard", element: <AdminLeaderboardPage /> },
  { path: "/admin/competitions/:id", element: <AdminCompetitionsIdPage /> },
  { path: "/admin/competitions/new", element: <AdminCompetitionsNewPage /> },
  { path: "/admin/crons", element: <AdminCronsPage /> },
  { path: "/admin/extensions", element: <AdminExtensionsPage /> },
  { path: "/admin/csv-import", element: <AdminCsvImportPage /> },
  { path: "/admin/leads", element: <AdminLeadsPage /> },
  { path: "/admin/live-events", element: <AdminLiveEventsPage /> },
  { path: "/admin/live-events/:slug", element: <AdminLiveEventsSlugPage /> },
  { path: "/admin/notifications", element: <AdminNotificationsPage /> },
  { path: "/admin/qa", element: <AdminQaPage /> },
  { path: "/admin/quizzes", element: <AdminQuizzesPage /> },
  { path: "/admin/quizzes/:lesson", element: <AdminQuizzesLessonPage /> },
  { path: "/admin/team", element: <AdminTeamPage /> },
  { path: "/admin/tiers", element: <AdminTiersPage /> },
  { path: "/admin/settings", element: <AdminSettingsPage /> },
  { path: "/admin/milestones", element: <AdminMilestonesPage /> },
  { path: "/admin/legal", element: <AdminLegalPage /> },
  { path: "/admin/brand-content", element: <AdminBrandContentPage /> },
  { path: "/admin/email-templates", element: <AdminEmailTemplatesPage /> },
  { path: "/admin/images", element: <AdminImagesPage /> },
  { path: "/admin/academy", element: <AdminAcademyPage /> },
  { path: "/admin/academy/:id", element: <AdminAcademyIdPage /> },
  { path: "/admin/trade-ideas", element: <AdminTradeIdeasPage /> },
  { path: "/admin/users", element: <AdminUsersPage /> },
  { path: "/admin/users/:id", element: <AdminUserDetailPage /> },
  { path: "/admin/telegram", element: <AdminTelegramFeedPage /> },
  { path: "/admin/tradingview", element: <AdminTradingViewFeedPage /> },
];
