import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { createAssistantSchema } from "@/lib/validation";
import { InsertAssistant } from "@shared/schema";
import { Loader2 } from "lucide-react";

interface CreateAssistantFormProps {
  onSuccess: () => void;
}

export function CreateAssistantForm({ onSuccess }: CreateAssistantFormProps) {
  const { toast } = useToast();
  const [temperature, setTemperature] = useState<number>(0.7);

  // Create form with validation
  const form = useForm<InsertAssistant>({
    resolver: zodResolver(createAssistantSchema),
    defaultValues: {
      name: "",
      description: "",
      model: "gpt-4o",
      temperature: 0.7,
      instructions: "",
    },
  });

  // Create assistant mutation
  const createAssistantMutation = useMutation({
    mutationFn: async (assistantData: InsertAssistant) => {
      const res = await apiRequest("POST", "/api/assistants", assistantData);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Assistant created",
        description: "Your new assistant has been created successfully",
      });
      form.reset();
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create assistant",
        description: error.message || "An error occurred while creating your assistant",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertAssistant) => {
    createAssistantMutation.mutate(data);
  };

  const handleTemperatureChange = (value: number[]) => {
    const newTemp = value[0];
    setTemperature(newTemp);
    form.setValue("temperature", newTemp);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Assistant</CardTitle>
      </CardHeader>
      <CardContent>
        <form id="create-assistant-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            <div className="sm:col-span-6">
              <Label htmlFor="name">Assistant Name*</Label>
              <div className="mt-1">
                <Input
                  id="name"
                  placeholder="e.g., Research Assistant"
                  {...form.register("name")}
                />
              </div>
              {form.formState.errors.name && (
                <p className="text-sm text-red-500 mt-1">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="sm:col-span-6">
              <Label htmlFor="description">Description</Label>
              <div className="mt-1">
                <Input
                  id="description"
                  placeholder="A short description of this assistant's purpose"
                  {...form.register("description")}
                />
              </div>
              {form.formState.errors.description && (
                <p className="text-sm text-red-500 mt-1">
                  {form.formState.errors.description.message}
                </p>
              )}
            </div>

            <div className="sm:col-span-3">
              <Label htmlFor="model">Model*</Label>
              <div className="mt-1">
                <Select
                  defaultValue="gpt-4o"
                  onValueChange={(value) => form.setValue("model", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                    <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                    <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.formState.errors.model && (
                <p className="text-sm text-red-500 mt-1">
                  {form.formState.errors.model.message}
                </p>
              )}
            </div>

            <div className="sm:col-span-3">
              <Label htmlFor="temperature">Temperature: {temperature}</Label>
              <div className="mt-3">
                <Slider
                  value={[temperature]}
                  min={0}
                  max={1}
                  step={0.1}
                  onValueChange={handleTemperatureChange}
                />
                <div className="flex justify-between text-xs text-gray-500 px-1 mt-1">
                  <span>0</span>
                  <span>0.5</span>
                  <span>1</span>
                </div>
              </div>
              {form.formState.errors.temperature && (
                <p className="text-sm text-red-500 mt-1">
                  {form.formState.errors.temperature.message}
                </p>
              )}
            </div>

            <div className="sm:col-span-6">
              <Label htmlFor="instructions">Instructions</Label>
              <div className="mt-1">
                <Textarea
                  id="instructions"
                  rows={4}
                  placeholder="You are a helpful assistant..."
                  {...form.register("instructions")}
                />
              </div>
              {form.formState.errors.instructions && (
                <p className="text-sm text-red-500 mt-1">
                  {form.formState.errors.instructions.message}
                </p>
              )}
              <p className="mt-2 text-sm text-gray-500">
                Instructions that the assistant should follow when responding to users.
              </p>
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex justify-end space-x-2">
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => form.reset()}
        >
          Reset
        </Button>
        <Button 
          type="submit" 
          form="create-assistant-form"
          disabled={createAssistantMutation.isPending}
        >
          {createAssistantMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            'Create Assistant'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}