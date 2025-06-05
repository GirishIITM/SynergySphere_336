import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { notificationAPI } from "../../utils/apiCalls/notificationAPI";
import { 
  Sun, 
  Moon, 
  Bookmark, 
  Archive, 
  MessageCircle, 
  Tag, 
  Clock, 
  CheckCircle,
  AlertCircle,
  User,
  Briefcase,
  Calendar,
  ExternalLink
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function Inbox() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [taggedNotifications, setTaggedNotifications] = useState([]);
  const [tab, setTab] = useState("activity");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadNotifications();
  }, []);

  /**
   * Load notifications based on the active tab
   */
  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError('');

      // Load tagged notifications
      const taggedResponse = await notificationAPI.getTaggedNotifications({
        limit: 50,
        unread_only: false
      });
      
      if (taggedResponse) {
        setTaggedNotifications(Array.isArray(taggedResponse) ? taggedResponse : []);
      }

      // Load all notifications for other tabs
      const allResponse = await notificationAPI.getNotifications();
      if (allResponse) {
        setNotifications(Array.isArray(allResponse) ? allResponse : []);
      }

    } catch (err) {
      console.error('Error loading notifications:', err);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle clicking on a notification to navigate to task details
   */
  const handleNotificationClick = async (notification) => {
    try {
      // Mark notification as read if it isn't already
      if (!notification.is_read) {
        await notificationAPI.markNotificationRead(notification.id);
        // Update local state
        setTaggedNotifications(prev => 
          prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
        );
        setNotifications(prev => 
          prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
        );
      }

      // Navigate to task details if task_id is available
      if (notification.task_id) {
        navigate(`/solutions/tasks/${notification.task_id}`);
      } else if (notification.project_id) {
        navigate(`/solutions/projects/${notification.project_id}`);
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  /**
   * Mark all notifications as read for the current tab
   */
  const handleMarkAllRead = async () => {
    try {
      const type = tab === 'tagged' ? 'tagged' : null;
      await notificationAPI.markAllNotificationsRead(type);
      
      // Update local state
      if (tab === 'tagged') {
        setTaggedNotifications(prev => 
          prev.map(n => ({ ...n, is_read: true }))
        );
      } else {
        setNotifications(prev => 
          prev.map(n => ({ ...n, is_read: true }))
        );
      }
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  /**
   * Filter notifications based on search query
   */
  const getFilteredNotifications = (notificationList) => {
    if (!searchQuery) return notificationList;
    
    return notificationList.filter(notification => 
      notification.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (notification.task_title && notification.task_title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (notification.project_name && notification.project_name.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  };

  /**
   * Get notification icon based on type
   */
  const getNotificationIcon = (notification) => {
    switch (notification.notification_type) {
      case 'tagged':
        return <Tag className="w-4 h-4 text-blue-500" />;
      case 'assigned':
        return <User className="w-4 h-4 text-green-500" />;
      default:
        return <MessageCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  /**
   * Render a notification item
   */
  const renderNotificationItem = (notification) => (
    <Card
      key={notification.id}
      className={`cursor-pointer transition-all hover:shadow-md mb-3 ${
        !notification.is_read ? 'border-l-4 border-l-blue-500 bg-blue-50/50' : ''
      }`}
      onClick={() => handleNotificationClick(notification)}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-1">
            {getNotificationIcon(notification)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className={`text-sm ${!notification.is_read ? 'font-semibold' : 'font-normal'}`}>
                  {notification.message}
                </p>
                
                {/* Task and Project context */}
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  {notification.task_title && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{notification.task_title}</span>
                    </div>
                  )}
                  
                  {notification.project_name && (
                    <div className="flex items-center gap-1">
                      <Briefcase className="w-3 h-3" />
                      <span>{notification.project_name}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2 flex-shrink-0">
                {!notification.is_read && (
                  <Badge variant="secondary" className="text-xs">
                    New
                  </Badge>
                )}
                
                {notification.task_id && (
                  <ExternalLink className="w-3 h-3 text-muted-foreground" />
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>
                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const currentNotifications = tab === 'tagged' 
    ? getFilteredNotifications(taggedNotifications)
    : getFilteredNotifications(notifications.filter(n => n.notification_type !== 'tagged'));

  const unreadCount = currentNotifications.filter(n => !n.is_read).length;

  return (
    <div className="flex min-h-screen" style={{ color: "var(--color-text)" }}>
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header
          className="flex items-center justify-between px-8 py-4 border-b"
          style={{ borderColor: "var(--color-border)" }}
        >
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold" style={{ color: "var(--color-accent)" }}>
              Inbox
            </h1>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadCount} unread
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <Input
              placeholder="Search notifications..."
              className="w-80"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            
            {unreadCount > 0 && (
              <Button variant="outline" onClick={handleMarkAllRead}>
                Mark All Read
              </Button>
            )}
          </div>
        </header>

        {/* Error Message */}
        {error && (
          <div className="px-8 py-4">
            <Card className="border-destructive">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab} className="px-8 pt-4 flex-1">
          <TabsList>
            <TabsTrigger value="tagged" className="flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Tagged ({taggedNotifications.length})
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              All Activity ({notifications.filter(n => n.notification_type !== 'tagged').length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tagged" className="mt-6">
            <ScrollArea className="h-[calc(100vh-200px)]">
              {taggedNotifications.length === 0 ? (
                <div className="text-center py-12">
                  <Tag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No tagged messages</h3>
                  <p className="text-muted-foreground">
                    You'll see notifications here when someone mentions you with @username
                  </p>
                </div>
              ) : (
                getFilteredNotifications(taggedNotifications).map(renderNotificationItem)
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="activity" className="mt-6">
            <ScrollArea className="h-[calc(100vh-200px)]">
              {notifications.filter(n => n.notification_type !== 'tagged').length === 0 ? (
                <div className="text-center py-12">
                  <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No activity notifications</h3>
                  <p className="text-muted-foreground">
                    You'll see general project and task notifications here
                  </p>
                </div>
              ) : (
                getFilteredNotifications(notifications.filter(n => n.notification_type !== 'tagged')).map(renderNotificationItem)
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}