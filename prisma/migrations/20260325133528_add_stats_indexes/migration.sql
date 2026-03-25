-- CreateIndex
CREATE INDEX "user_questions_userId_box_idx" ON "user_questions"("userId", "box");

-- CreateIndex
CREATE INDEX "user_questions_userId_lastSeenAt_idx" ON "user_questions"("userId", "lastSeenAt");
