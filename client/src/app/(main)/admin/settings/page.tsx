"use client"

import * as React from "react"
import {
    IconUser,
    IconShieldLock,
    IconBell,
    IconPalette,
    IconDeviceDesktop,
    IconCamera,
    IconLoader2
} from "@tabler/icons-react"
import { useSession } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { useTheme } from "next-themes"
import { toast } from "sonner"
import { ConfirmationDialog } from "@/components/confirmation-dialog"

export default function SettingsPage() {
    const { data: session, isPending } = useSession()
    const { theme, setTheme } = useTheme()
    const [updating, setUpdating] = React.useState(false)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false)

    if (isPending) {
        return (
            <div className="flex h-[450px] items-center justify-center">
                <IconLoader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    const user = session?.user

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault()
        setUpdating(true)
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000))
        setUpdating(false)
        toast.success("Profile updated successfully")
    }

    return (
        <div className="space-y-6">
            <div className="space-y-0.5 mt-6">
                <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">
                    Manage your account preferences and system configuration.
                </p>
            </div>

            <Tabs defaultValue="general" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="general" className="flex items-center gap-2">
                        <IconUser className="size-4" />
                        General
                    </TabsTrigger>
                    <TabsTrigger value="security" className="flex items-center gap-2">
                        <IconShieldLock className="size-4" />
                        Security
                    </TabsTrigger>
                    <TabsTrigger value="notifications" className="flex items-center gap-2">
                        <IconBell className="size-4" />
                        Notifications
                    </TabsTrigger>
                    <TabsTrigger value="display" className="flex items-center gap-2">
                        <IconPalette className="size-4" />
                        Display
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Public Profile</CardTitle>
                                <CardDescription>
                                    This information will be displayed to other platform users.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <Avatar className="h-20 w-20">
                                        <AvatarImage src={user?.image ?? ""} />
                                        <AvatarFallback>
                                            {user?.name?.[0] ?? "U"}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="space-y-1">
                                        <h4 className="text-sm font-medium">{user?.name}</h4>
                                        <p className="text-xs text-muted-foreground">Admin User</p>
                                    </div>
                                </div>
                                <form onSubmit={handleSaveProfile} className="space-y-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="name">Full Name</Label>
                                        <Input
                                            id="name"
                                            defaultValue={user?.name ?? ""}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="email">Email Address</Label>
                                        <Input
                                            id="email"
                                            defaultValue={user?.email ?? ""}
                                            disabled
                                        />
                                        <p className="text-[12px] text-muted-foreground">Email changes are restricted for security.</p>
                                    </div>
                                    <Button disabled={updating} type="submit" className="w-full">
                                        {updating && <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Update Profile
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>

                        <div className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Platform Status</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between p-3 rounded-lg border">
                                        <div className="flex items-center gap-3">
                                            <div className="h-2 w-2 rounded-full bg-green-500" />
                                            <div>
                                                <p className="text-sm font-medium">API Connectivity</p>
                                                <p className="text-xs text-muted-foreground">Operational</p>
                                            </div>
                                        </div>
                                        <span className="text-xs text-muted-foreground">24ms</span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 rounded-lg border">
                                        <div className="flex items-center gap-3">
                                            <div className="h-2 w-2 rounded-full bg-green-500" />
                                            <div>
                                                <p className="text-sm font-medium">Database Engine</p>
                                                <p className="text-xs text-muted-foreground">Healthy</p>
                                            </div>
                                        </div>
                                        <span className="text-xs text-muted-foreground">v15.2</span>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-destructive/20">
                                <CardHeader>
                                    <CardTitle className="text-destructive">Danger Zone</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Once you deactivate your account, there is no going back. Please be certain.
                                    </p>
                                    <Button variant="destructive" className="w-full" onClick={() => setIsDeleteModalOpen(true)}>
                                        Deactivate Account
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="security" className="space-y-6">
                    <div className="max-w-2xl">
                        <Card>
                            <CardHeader>
                                <CardTitle>Security Credentials</CardTitle>
                                <CardDescription>
                                    Secure your account by enabling two-factor authentication or updating your passphrase.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label>Two-Factor Authentication</Label>
                                        <p className="text-sm text-muted-foreground">Add an extra layer of security to your account.</p>
                                    </div>
                                    <Switch />
                                </div>
                                <Separator />
                                <form className="space-y-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="current-password">Current Password</Label>
                                        <Input id="current-password" type="password" />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="new-password">New Password</Label>
                                        <Input id="new-password" type="password" />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="confirm-password">Confirm New Password</Label>
                                        <Input id="confirm-password" type="password" />
                                    </div>
                                    <Button className="w-full">
                                        Change Password
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="display" className="space-y-6">
                    <div className="max-w-3xl">
                        <Card>
                            <CardHeader>
                                <CardTitle>Visual Interface</CardTitle>
                                <CardDescription>
                                    Customize the appearance of the platform to suit your preference.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    <button
                                        onClick={() => setTheme("light")}
                                        className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-all ${theme === 'light' ? 'border-primary bg-primary/5' : 'hover:bg-muted'}`}
                                    >
                                        <div className="h-12 w-full rounded border bg-white" />
                                        <span className="text-sm font-medium">Light Mode</span>
                                    </button>
                                    <button
                                        onClick={() => setTheme("dark")}
                                        className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-all ${theme === 'dark' ? 'border-primary bg-primary/5' : 'hover:bg-muted'}`}
                                    >
                                        <div className="h-12 w-full rounded border bg-black" />
                                        <span className="text-sm font-medium">Dark Mode</span>
                                    </button>
                                    <button
                                        onClick={() => setTheme("system")}
                                        className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-all ${theme === 'system' ? 'border-primary bg-primary/5' : 'hover:bg-muted'}`}
                                    >
                                        <div className="h-12 w-full rounded border bg-linear-to-br from-white to-black" />
                                        <span className="text-sm font-medium">System</span>
                                    </button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>

            <ConfirmationDialog
                open={isDeleteModalOpen}
                onOpenChange={setIsDeleteModalOpen}
                title="Deactivate Account?"
                description="This action is permanent and cannot be undone. You will lose access to all your data."
                onConfirm={() => {
                    setIsDeleteModalOpen(false)
                    toast.error("Account deactivation is not implemented in this demo.")
                }}
                confirmText="Deactivate"
            />
        </div>
    )
}
