export type SidebarMenuItem = {
  label: string;
  icon: "dashboard" | "booking" | "history";
  active?: boolean;
};

export type FacilityItem = {
  label: string;
  icon: "users" | "fan" | "table" | "snowflake" | "sofa" | "tv" | "shield";
};

export type FeaturedRoom = {
  title: string;
  price: string;
  badge?: string;
  facilities: FacilityItem[];
};

export type RoomCardItem = {
  name: string;
  type: "Regular" | "VIP";
  tables: number;
  time: string;
  status: "AVAILABLE" | "OCCUPIED";
  active?: boolean;
};

export const sidebarMenu: SidebarMenuItem[] = [
  { label: "Dashboard", icon: "dashboard", active: true },
  { label: "Booking", icon: "booking" },
  { label: "History", icon: "history" },
];

export const featuredRooms: FeaturedRoom[] = [
  {
    title: "Regular Room",
    price: "IDR 35.000/hr",
    facilities: [
      { label: "Social Area", icon: "users" },
      { label: "Fan Cooled", icon: "fan" },
      { label: "12 Tables Ready", icon: "table" },
    ],
  },
  {
    title: "VIP Room",
    price: "IDR 75.000/hr",
    badge: "LIMITED",
    facilities: [
      { label: "Full AC", icon: "snowflake" },
      { label: "Sofa Seats", icon: "sofa" },
      { label: "Smart TV", icon: "tv" },
      { label: "Private Area", icon: "shield" },
    ],
  },
];

export const rooms: RoomCardItem[] = [
  {
    name: "Room A",
    type: "Regular",
    tables: 4,
    time: "11:00 - 12:00",
    status: "AVAILABLE",
    active: true,
  },
  {
    name: "Room B",
    type: "VIP",
    tables: 8,
    time: "19:00 - 20:00",
    status: "AVAILABLE",
  },
  {
    name: "Room C",
    type: "Regular",
    tables: 5,
    time: "17:00 - 19:00",
    status: "OCCUPIED",
  },
  {
    name: "Room D",
    type: "VIP",
    tables: 9,
    time: "14:00 - 16:00",
    status: "OCCUPIED",
  },
  {
    name: "Room E",
    type: "VIP",
    tables: 8,
    time: "15:00 - 17:00",
    status: "AVAILABLE",
  },
  {
    name: "Room F",
    type: "Regular",
    tables: 5,
    time: "18:00 - 20:00",
    status: "OCCUPIED",
  },
];
