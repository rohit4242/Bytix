import {
    IconLayoutDashboard,
    IconTruck,
    IconUsers,
    IconUserShield,
    IconSettings,
    IconHelpCircle,
    IconPackage,
    IconMapPin,
    IconChartBar,
    IconCash,
    IconClipboardList,
    IconUserCircle,
    IconBuildingStore,
    IconMessageCircle,
    IconCircleDot,
    IconCommand,
    IconBox,
    IconRobot,
    IconTrendingUp,
    IconBroadcast,
    IconArrowsExchange,
    IconBriefcase,
    IconActivity,
    IconChartLine,
    IconWallet,
    type Icon,
} from "@tabler/icons-react"

// ─── Shared Types ─────────────────────────────────────────────────────────────

export type NavIconName =
    | "dashboard"
    | "package"
    | "truck"
    | "users"
    | "chart"
    | "map-pin"
    | "cash"
    | "settings"
    | "help"
    | "clipboard"
    | "user-circle"
    | "store"
    | "shield"
    | "message"
    | "circle"
    | "command"
    | "square" // Added square for ACME logo
    | "box" // Added for Apps
    | "clerk" // Added for Secured by Clerk
    | "bot"
    | "trending-up"
    | "broadcast"
    | "arrows-exchange"
    | "briefcase"
    | "activity"
    | "chart-line"
    | "wallet"

export const navIconMap: Record<NavIconName, Icon> = {
    dashboard: IconLayoutDashboard,
    package: IconPackage,
    truck: IconTruck,
    users: IconUsers,
    chart: IconChartBar,
    "map-pin": IconMapPin,
    cash: IconCash,
    settings: IconSettings,
    help: IconHelpCircle,
    clipboard: IconClipboardList,
    "user-circle": IconUserCircle,
    store: IconBuildingStore,
    shield: IconUserShield,
    message: IconMessageCircle,
    circle: IconCircleDot,
    command: IconCommand,
    square: IconLayoutDashboard, // using dashboard as a generic square
    box: IconBox, // using box for Apps
    clerk: IconBuildingStore, // using store for clerk logo as generic fallback
    bot: IconRobot,
    "trending-up": IconTrendingUp,
    broadcast: IconBroadcast,
    "arrows-exchange": IconArrowsExchange,
    briefcase: IconBriefcase,
    activity: IconActivity,
    "chart-line": IconChartLine,
    wallet: IconWallet,
}

export interface NavSubItem {
    title: string
    url: string
}

export interface NavItem {
    title: string
    url: string
    icon?: NavIconName
    badge?: string
    isActive?: boolean
    items?: NavSubItem[]
}

export interface NavGroup {
    title: string
    items: NavItem[]
}

export interface SidebarUser {
    name: string
    email: string
    avatar: string
    role: string
}

export interface SidebarTeam {
    name: string
    logo: NavIconName
    plan: string
}

export interface SidebarData {
    user: SidebarUser
    teams: SidebarTeam[]
    navGroups: NavGroup[]
    navSecondary: NavItem[]
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export const adminSidebarData: SidebarData = {
    user: {
        name: "Admin",
        email: "admin@bytix.app",
        avatar: "/avatars/admin.jpg",
        role: "ADMIN",
    },
    teams: [
        { name: "Bytix Admin", logo: "command", plan: "Admin Kit" },
    ],
    navSecondary: [],
    navGroups: [
        {
            title: "PLATFORM",
            items: [
                { title: "Overview", url: "/admin", icon: "dashboard" },
                { title: "Users & Agents", url: "/admin/users", icon: "users" },
            ],
        },
        {
            title: "SECURITY",
            items: [
                { title: "IP Whitelisting", url: "/admin/security/ip-whitelist", icon: "shield" },
            ],
        },
        {
            title: "SYSTEM",
            items: [
                { title: "Settings", url: "/admin/settings", icon: "settings" },
            ],
        },
    ],
}

/**
 * Generates context-aware navigation groups for the Admin viewing portal.
 */
export function getAdminViewGroups(userId: string): NavGroup[] {
    return [
        {
            title: "VIEW CONTEXT",
            items: [
                { title: "User Summary", url: `/admin/view/${userId}`, icon: "user-circle" },
            ],
        },
        {
            title: "USER TRADING",
            items: [
                { title: "Bots & Strategies", url: `/admin/view/${userId}/bots`, icon: "bot" },
                { title: "Active Positions", url: `/admin/view/${userId}/positions`, icon: "activity" },
                { title: "Signal Pulse", url: `/admin/view/${userId}/signals`, icon: "broadcast" },
                { title: "Connected Keys", url: `/admin/view/${userId}/exchanges`, icon: "arrows-exchange" },
            ],
        },
    ]
}

// ─── Agent ────────────────────────────────────────────────────────────────────

export const agentSidebarData: SidebarData = {
    user: {
        name: "Agent",
        email: "agent@bytix.app",
        avatar: "/avatars/agent.jpg",
        role: "AGENT",
    },
    teams: [
        { name: "Bytix Agent", logo: "command", plan: "Field Team" },
    ],
    navSecondary: [
        { title: "Settings", url: "/agent/settings", icon: "settings" },
        { title: "Support", url: "/agent/help", icon: "help" },
    ],
    navGroups: [
        {
            title: "OVERVIEW",
            items: [
                { title: "Dashboard", url: "/agent", icon: "dashboard", isActive: true },
            ],
        },
        {
            title: "MANAGEMENT",
            items: [
                { title: "Customers", url: "/agent/customers", icon: "users" },
                {
                    title: "Orders",
                    url: "/agent/orders",
                    icon: "clipboard",
                    items: [
                        { title: "Active", url: "/agent/orders/active" },
                        { title: "History", url: "/agent/orders/history" },
                    ],
                },
            ],
        },
        {
            title: "COMMUNICATION",
            items: [
                { title: "Chats", url: "/agent/chats", icon: "message", badge: "3" },
            ],
        },
        {
            title: "SYSTEM",
            items: [
                { title: "Settings", url: "/agent/settings", icon: "settings" },
            ],
        },
    ],
}

// ─── Customer ─────────────────────────────────────────────────────────────────

export const customerSidebarData: SidebarData = {
    user: {
        name: "Customer",
        email: "customer@bytix.app",
        avatar: "/avatars/customer.jpg",
        role: "CUSTOMER",
    },
    teams: [
        { name: "Bytix Portal", logo: "command", plan: "Customer" },
    ],
    navSecondary: [
        { title: "Account Settings", url: "/customer/settings", icon: "settings" },
        { title: "Help & FAQ", url: "/customer/help", icon: "help" },
    ],
    navGroups: [
        {
            title: "General",
            items: [
                { title: "Dashboard", url: "/customer", icon: "dashboard" },
                {
                    title: "My Orders",
                    url: "/customer/orders",
                    icon: "package",
                    items: [
                        { title: "Active", url: "/customer/orders/active" },
                        { title: "Past Orders", url: "/customer/orders/history" },
                    ],
                },
                { title: "Merchants", url: "/customer/merchants", icon: "store" },
            ],
        },
        {
            title: "Account",
            items: [
                { title: "Profile", url: "/customer/profile", icon: "user-circle" },
                { title: "Security", url: "/customer/security", icon: "shield" },
            ],
        },
    ],
}
