import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { UserPlus, MoreHorizontal, Users, Edit, Trash2, Key, CheckCircle, X, Mail } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { z } from "zod";

// User form validation schema
const userFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  role: z.enum(["Admin", "Editor", "Viewer"]),
  password: z.string().optional(),
});

type UserFormValues = z.infer<typeof userFormSchema>;

export default function UsersPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // User management state
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [isDeleteUserOpen, setIsDeleteUserOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [currentAction, setCurrentAction] = useState("");
  const [isActionPending, setIsActionPending] = useState(false);
  const [popoverUser, setPopoverUser] = useState<number | null>(null);
  
  // Form state
  const [formValues, setFormValues] = useState<UserFormValues>({
    name: "",
    email: "",
    role: "Viewer",
    password: "",
  });
  
  // Check if user is admin (temporary solution - assuming test@example.com is admin)
  const isAdmin = user?.email === "test@example.com";
  
  // Redirect if not admin
  useEffect(() => {
    if (!isAdmin) {
      setLocation("/");
    }
  }, [isAdmin, setLocation]);
  
  // Handlers
  const handleAddUser = () => {
    setFormValues({
      name: "",
      email: "",
      role: "Viewer",
      password: "",
    });
    setIsAddUserOpen(true);
  };
  
  const handleEditUser = (user: any) => {
    setSelectedUser(user);
    setFormValues({
      name: user.name,
      email: user.email,
      role: user.role,
    });
    setIsEditUserOpen(true);
  };
  
  const handleDeleteUser = (user: any) => {
    setSelectedUser(user);
    setIsDeleteUserOpen(true);
  };
  
  const handleResetPassword = (user: any) => {
    setSelectedUser(user);
    setIsResetPasswordOpen(true);
  };
  
  const handleFormInput = (field: keyof UserFormValues, value: any) => {
    setFormValues(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const handleUserSubmit = () => {
    // Validate form
    try {
      userFormSchema.parse(formValues);
      
      setIsActionPending(true);
      
      // Simulate API call
      setTimeout(() => {
        setIsActionPending(false);
        setIsAddUserOpen(false);
        setIsEditUserOpen(false);
        
        toast({
          title: "Success",
          description: isEditUserOpen ? "User updated successfully" : "User created successfully",
        });
      }, 1000);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(e => `${e.path}: ${e.message}`).join(', ');
        toast({
          title: "Validation Error",
          description: errorMessages,
          variant: "destructive",
        });
      }
    }
  };
  
  const confirmDeleteUser = () => {
    setIsActionPending(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsActionPending(false);
      setIsDeleteUserOpen(false);
      
      toast({
        title: "Success",
        description: `User ${selectedUser?.name} deleted successfully`,
      });
    }, 1000);
  };
  
  const confirmResetPassword = () => {
    setIsActionPending(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsActionPending(false);
      setIsResetPasswordOpen(false);
      
      toast({
        title: "Success",
        description: `Password reset email sent to ${selectedUser?.email}`,
      });
    }, 1000);
  };
  // Sample user data for demonstration
  const users = [
    { id: 1, name: "Test User", email: "test@example.com", role: "Admin", status: "Active", lastActive: "Today, 2:30 PM" },
    { id: 2, name: "Jane Smith", email: "jane@example.com", role: "Editor", status: "Active", lastActive: "Yesterday" },
    { id: 3, name: "Bob Johnson", email: "bob@example.com", role: "Viewer", status: "Inactive", lastActive: "Apr 25, 2025" },
  ];

  return (
    <div className="flex-1 p-4 md:p-6 lg:p-8 max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-2xl md:text-3xl font-bold">User Management</h2>
        <Button 
          className="flex items-center gap-2 w-full sm:w-auto"
          onClick={handleAddUser}
        >
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
          <CardContent className="p-0 sm:p-6">
            <div className="overflow-x-auto">
              <Table className="min-w-[650px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Last Active</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell className="max-w-[120px] truncate">{user.email}</TableCell>
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
                      <TableCell className="text-muted-foreground text-sm hidden md:table-cell">{user.lastActive}</TableCell>
                      <TableCell>
                        <Popover open={popoverUser === user.id} onOpenChange={(open) => setPopoverUser(open ? user.id : null)}>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-44 p-2" align="end">
                            <div className="grid gap-1">
                              <Button 
                                variant="ghost" 
                                className="flex items-center justify-start h-9 px-2 text-sm" 
                                onClick={() => handleEditUser(user)}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </Button>
                              <Button 
                                variant="ghost" 
                                className="flex items-center justify-start h-9 px-2 text-sm" 
                                onClick={() => handleResetPassword(user)}
                              >
                                <Key className="mr-2 h-4 w-4" />
                                Reset Password
                              </Button>
                              <Button 
                                variant="ghost" 
                                className="flex items-center justify-start h-9 px-2 text-sm text-red-500" 
                                onClick={() => handleDeleteUser(user)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </Button>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {/* Mobile card view (visible on smaller screens) */}
            <div className="md:hidden space-y-4 p-4">
              {users.map((user) => (
                <Card key={user.id} className="p-0 overflow-hidden">
                  <CardContent className="p-4 pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                      <Popover open={popoverUser === user.id} onOpenChange={(open) => setPopoverUser(open ? user.id : null)}>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-44 p-2" align="end">
                          <div className="grid gap-1">
                            <Button 
                              variant="ghost" 
                              className="flex items-center justify-start h-9 px-2 text-sm" 
                              onClick={() => handleEditUser(user)}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </Button>
                            <Button 
                              variant="ghost" 
                              className="flex items-center justify-start h-9 px-2 text-sm" 
                              onClick={() => handleResetPassword(user)}
                            >
                              <Key className="mr-2 h-4 w-4" />
                              Reset Password
                            </Button>
                            <Button 
                              variant="ghost" 
                              className="flex items-center justify-start h-9 px-2 text-sm text-red-500" 
                              onClick={() => handleDeleteUser(user)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </Button>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={user.role === "Admin" ? "default" : user.role === "Editor" ? "outline" : "secondary"}>
                        {user.role}
                      </Badge>
                      <Badge variant={user.status === "Active" ? "default" : "destructive"}>
                        {user.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground ml-auto">{user.lastActive}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Add/Edit User Dialog */}
      <Dialog open={isAddUserOpen || isEditUserOpen} onOpenChange={(open) => {
        if (!open) {
          setIsAddUserOpen(false);
          setIsEditUserOpen(false);
        }
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{isEditUserOpen ? 'Edit User' : 'Add New User'}</DialogTitle>
            <DialogDescription>
              {isEditUserOpen ? 'Update user information.' : 'Fill in the details to create a new user.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                placeholder="Enter name"
                className="col-span-3"
                value={formValues.name}
                onChange={(e) => handleFormInput('name', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                placeholder="Enter email"
                className="col-span-3"
                value={formValues.email}
                onChange={(e) => handleFormInput('email', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">
                Role
              </Label>
              <Select
                value={formValues.role}
                onValueChange={(value) => handleFormInput('role', value)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="Editor">Editor</SelectItem>
                  <SelectItem value="Viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {!isEditUserOpen && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="password" className="text-right">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter password"
                  className="col-span-3"
                  value={formValues.password || ''}
                  onChange={(e) => handleFormInput('password', e.target.value)}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setIsAddUserOpen(false);
                setIsEditUserOpen(false);
              }}
              disabled={isActionPending}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={handleUserSubmit} 
              disabled={isActionPending}
            >
              {isActionPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditUserOpen ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                isEditUserOpen ? 'Update User' : 'Create User'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <Dialog open={isDeleteUserOpen} onOpenChange={setIsDeleteUserOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm User Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedUser?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsDeleteUserOpen(false)}
              disabled={isActionPending}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              variant="destructive" 
              onClick={confirmDeleteUser}
              disabled={isActionPending}
            >
              {isActionPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete User'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={isResetPasswordOpen} onOpenChange={setIsResetPasswordOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Reset User Password</DialogTitle>
            <DialogDescription>
              Send a password reset email to {selectedUser?.email}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsResetPasswordOpen(false)}
              disabled={isActionPending}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={confirmResetPassword}
              disabled={isActionPending}
            >
              {isActionPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Reset Email
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}