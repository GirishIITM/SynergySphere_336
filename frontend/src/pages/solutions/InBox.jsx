import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Sun, Moon, Bookmark, Archive } from "lucide-react";

export default function Inbox() {
  const [notifications, setNotifications] = useState([]);
  const [tab, setTab] = useState("activity");

  useEffect(() => {
    fetch("/api/inbox")
      .then((res) => res.json())
      .then((data) => setNotifications(data));
  }, []);

  return (
    <div
      className="flex min-h-screen"
      style={{
        
        color: "var(--color-text)",
        transition: "background 0.3s, color 0.3s",
      }}
    >
      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header
          className="flex items-center justify-between px-8 py-4 border-b"
          style={{
            borderColor: "var(--color-border)"
           
          }}
        >
          <h1
            className="text-2xl font-bold"
            style={{
              color: "var(--color-accent)",
            }}
          >
            Inbox
          </h1>
          <Input
            placeholder="Search..."
            className="w-1/3"
            style={{
              
              border: "none",
              color: "var(--color-input-text)",
            }}
          />
          <Button
            variant="outline"
            className="ml-4"
            
          >
            Manage Notifications
          </Button>
        </header>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab} className="px-8 pt-4">
          <TabsList>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="bookmarks">Bookmarks</TabsTrigger>
            <TabsTrigger value="archived">Archived</TabsTrigger>
          </TabsList>
          <div
            className="flex justify-between mt-4 text-sm"
            style={{ color: "var(--color-text-secondary)" }}
          >
            <span>🔎 Filter</span>
            <span>
              Sort: <b>Newest</b>
            </span>
          </div>
          <TabsContent value="activity">
            <div className="mt-4">
              <div
                className="font-bold mb-2"
                style={{ color: "var(--color-accent)" }}
              >
                Today
              </div>
              {notifications.length === 0 && (
                <div
                  className="text-center py-8"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  No notifications.
                </div>
              )}
              {notifications.map((item, idx) => (
                <Card
                  key={idx}
                  className="flex justify-between items-center mb-4 px-6 py-4"
                  style={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <div>
                    <div
                      className="text-lg"
                      style={{ color: "var(--color-text)" }}
                    >
                      {item.message}
                    </div>
                    <div
                      className="text-xs mt-1"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      ○ {item.user} · {item.timeAgo}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" title="Bookmark">
                      <Bookmark className="w-5 h-5" />
                    </Button>
                    <Button variant="ghost" size="icon" title="Archive">
                      <Archive className="w-5 h-5" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
          {/* Add similar content for Bookmarks and Archived if needed */}
        </Tabs>
      </main>
    </div>
  );
}