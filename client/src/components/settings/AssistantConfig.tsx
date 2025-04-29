import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Card, CardContent } from "@/components/ui/card";
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

interface AssistantConfigForm {
  apiKey: string;
  assistantId: string;
  model: string;
  temperature: number;
  instructions: string;
}

export default function AssistantConfig() {
  const { toast } = useToast();
  const [temperature, setTemperature] = useState<number>(0.7);

  const { register, handleSubmit, setValue, reset } = useForm<AssistantConfigForm>({
    defaultValues: {
      apiKey: "",
      assistantId: "",
      model: "gpt-4o",
      temperature: 0.7,
      instructions: "",
    },
  });

  useEffect(() => {
    // Load saved settings from localStorage
    const apiKey = localStorage.getItem("OPENAI_KEY") || "";
    const assistantId = localStorage.getItem("ASSISTANT_ID") || "";
    const model = localStorage.getItem("ASSISTANT_MODEL") || "gpt-4o";
    const temp = parseFloat(localStorage.getItem("ASSISTANT_TEMPERATURE") || "0.7");
    const instructions = localStorage.getItem("ASSISTANT_INSTRUCTIONS") || "";

    reset({
      apiKey,
      assistantId,
      model,
      temperature: temp,
      instructions,
    });

    setTemperature(temp);
  }, [reset]);

  const onSubmit = (data: AssistantConfigForm) => {
    try {
      // Save settings to localStorage
      localStorage.setItem("OPENAI_KEY", data.apiKey);
      localStorage.setItem("ASSISTANT_ID", data.assistantId);
      localStorage.setItem("ASSISTANT_MODEL", data.model);
      localStorage.setItem("ASSISTANT_TEMPERATURE", data.temperature.toString());
      localStorage.setItem("ASSISTANT_INSTRUCTIONS", data.instructions);

      toast({
        title: "Settings saved",
        description: "Assistant configuration has been saved",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Failed to save settings",
        description: "An error occurred while saving settings",
        variant: "destructive",
      });
    }
  };

  const handleTemperatureChange = (value: number[]) => {
    const newTemp = value[0];
    setTemperature(newTemp);
    setValue("temperature", newTemp);
  };

  return (
    <div>
      <div className="pb-5 border-b border-gray-200">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          Assistant Configuration
        </h3>
        <p className="mt-2 max-w-4xl text-sm text-gray-500">
          Configure your OpenAI assistant settings and API credentials
        </p>
      </div>

      <Card className="mt-8 max-w-3xl">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-6">
                <Label htmlFor="apiKey">OpenAI API Key</Label>
                <div className="mt-1">
                  <Input
                    id="apiKey"
                    type="password"
                    autoComplete="off"
                    {...register("apiKey")}
                  />
                </div>
              </div>

              <div className="sm:col-span-6">
                <Label htmlFor="assistantId">Assistant ID</Label>
                <div className="mt-1">
                  <Input
                    id="assistantId"
                    placeholder="asst_abc123..."
                    {...register("assistantId")}
                  />
                </div>
              </div>

              <div className="sm:col-span-3">
                <Label htmlFor="model">Model</Label>
                <div className="mt-1">
                  <Select
                    defaultValue="gpt-4o"
                    onValueChange={(value) => setValue("model", value)}
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
              </div>

              <div className="sm:col-span-6">
                <Label htmlFor="instructions">Instructions</Label>
                <div className="mt-1">
                  <Textarea
                    id="instructions"
                    rows={3}
                    placeholder="You are a helpful assistant..."
                    {...register("instructions")}
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Instructions that the assistant should follow when responding to users.
                </p>
              </div>
            </div>

            <div className="pt-5">
              <div className="flex justify-end">
                <Button type="button" variant="outline" className="mr-3" onClick={() => reset()}>
                  Cancel
                </Button>
                <Button type="submit">Save</Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
