import React from "react";
import { TestNote, User } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";

export default function TestNotes({ testId }) {
  const [notes, setNotes] = React.useState([]);
  const [me, setMe] = React.useState(null);
  const [text, setText] = React.useState("");

  const load = React.useCallback(async () => {
    const list = await TestNote.filter({ ab_test_id: testId }, "-created_at", 50);
    setNotes(list);
  }, [testId]);

  React.useEffect(() => {
    (async () => {
      try {
        const user = await User.me();
        setMe(user);
      } catch {
        setMe(null);
      }
      if (testId) load();
    })();
  }, [testId, load]);

  const addNote = async () => {
    if (!text.trim() || !me) return;
    await TestNote.create({
      ab_test_id: testId,
      user_id: me.id,
      content: text.trim(),
      created_at: new Date().toISOString()
    });
    setText("");
    load();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Notes & Comments</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Textarea
            placeholder="Add a note for your team..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="flex justify-end">
            <Button onClick={addNote} disabled={!text.trim()}>Add Note</Button>
          </div>
        </div>
        <div className="space-y-3">
          {notes.length === 0 ? (
            <div className="text-sm text-slate-500">No notes yet.</div>
          ) : notes.map(n => (
            <div key={n.id} className="border rounded-lg p-3 bg-white">
              <div className="text-sm text-slate-800 whitespace-pre-wrap">{n.content}</div>
              <div className="text-xs text-slate-500 mt-2">
                {format(new Date(n.created_at), "MMM d, yyyy h:mm a")} · {me && n.user_id === me.id ? "You" : `User ${String(n.user_id).slice(0,6)}...`}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}