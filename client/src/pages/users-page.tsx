import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { UserPlus, MoreHorizontal, Users } from "lucide-react";

export default function UsersPage() {
  // Sample user data for demonstration
  const users = [
    { id: 1, name: "Test User", email: "test@example.com", role: "Admin", status: "Active", lastActive: "Today, 2:30 PM" },
    { id: 2, name: "Jane Smith", email: "jane@example.com", role: "Editor", status: "Active", lastActive: "Yesterday" },
    { id: 3, name: "Bob Johnson", email: "bob@example.com", role: "Viewer", status: "Inactive", lastActive: "Apr 25, 2025" },
  ];

  return (
    <div className="flex-1 p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">User Management</h2>
        <Button className="flex items-center gap-2">
          <UserPlus size={16} /> Add User
        </Button>
      </div>

      <div className="grid gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>User Statistics</CardTitle>
            <CardDescription>
              Overview of user accounts and activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-primary/10 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                  <Users className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-sm text-gray-500">Total Users</p>
                    <p className="text-2xl font-bold">{users.length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-green-100 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                  <Users className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-500">Active Users</p>
                    <p className="text-2xl font-bold">{users.filter(u => u.status === "Active").length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-yellow-100 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                  <Users className="h-8 w-8 text-yellow-600" />
                  <div>
                    <p className="text-sm text-gray-500">Admins</p>
                    <p className="text-2xl font-bold">{users.filter(u => u.role === "Admin").length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-blue-100 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                  <Users className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-500">New Users (30d)</p>
                    <p className="text-2xl font-bold">1</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
            <CardDescription>
              Manage user accounts and permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === "Admin" ? "default" : user.role === "Editor" ? "outline" : "secondary"}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.status === "Active" ? "default" : "destructive"}>
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-500 text-sm">{user.lastActive}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}