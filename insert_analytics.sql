-- Insert sample analytics data for the past 30 days
DO $$
DECLARE
    user_id integer := 1;
    assistant_id integer := 1;
    thread_id integer := 1;
    current_date timestamp;
    i integer;
    model_id text;
    prompt_tokens integer;
    completion_tokens integer;
    total_tokens integer;
    cost numeric;
    request_type text;
BEGIN
    -- Generate data for the past 30 days
    FOR i IN 1..30 LOOP
        -- Set date to i days ago
        current_date := NOW() - (i || ' days')::interval;
        
        -- Choose a model based on the day
        IF i % 7 = 0 THEN
            model_id := 'gpt-4';
        ELSIF i % 5 = 0 THEN
            model_id := 'gpt-3.5-turbo';
        ELSIF i % 3 = 0 THEN
            model_id := 'gpt-4-turbo';
        ELSE
            model_id := 'gpt-4o';
        END IF;
        
        -- Generate between 1 and 5 entries per day
        FOR j IN 1..1 + floor(random() * 5)::int LOOP
            -- Generate random token counts
            prompt_tokens := 100 + floor(random() * 500);
            completion_tokens := 50 + floor(random() * 300);
            total_tokens := prompt_tokens + completion_tokens;
            
            -- Calculate cost based on model
            IF model_id = 'gpt-4' THEN
                cost := (prompt_tokens * 0.03 / 1000) + (completion_tokens * 0.06 / 1000);
            ELSIF model_id = 'gpt-3.5-turbo' THEN
                cost := (prompt_tokens * 0.0005 / 1000) + (completion_tokens * 0.0015 / 1000);
            ELSIF model_id = 'gpt-4-turbo' THEN
                cost := (prompt_tokens * 0.01 / 1000) + (completion_tokens * 0.03 / 1000);
            ELSE
                cost := (prompt_tokens * 0.005 / 1000) + (completion_tokens * 0.015 / 1000);
            END IF;
            
            -- Choose request type
            IF j % 3 = 0 THEN
                request_type := 'completion';
            ELSE
                request_type := 'chat_completion';
            END IF;
            
            -- Insert usage analytics record
            INSERT INTO usage_analytics (
                user_id, 
                assistant_id, 
                thread_id, 
                model_id, 
                prompt_tokens, 
                completion_tokens, 
                total_tokens, 
                estimated_cost, 
                request_type, 
                success, 
                created_at
            ) VALUES (
                user_id,
                assistant_id,
                thread_id,
                model_id,
                prompt_tokens,
                completion_tokens,
                total_tokens,
                cost,
                request_type,
                TRUE,
                current_date + (j || ' hours')::interval
            );
        END LOOP;
    END LOOP;
END $$;
