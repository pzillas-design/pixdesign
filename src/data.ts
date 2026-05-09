export type Category = 'fotos' | 'apps' | 'videos';
export type GalleryCategory = Category | 'alle';

export type Project = {
  id: string;
  src: string;
  detailSrc: string;
  images?: string[];
  aspectRatio?: number;
  title: string;
  tag: string;
  category: Category;
};

export const projects: Project[] = [
  { id: 'foto-1-business', src: '/media/foto-square/1_business.webp', detailSrc: '/media/foto-hd/1_business.webp', title: 'Business 01', tag: 'Foto', category: 'fotos' },
  { id: 'foto-2-immobilien', src: '/media/foto-square/2_immobilien.webp', detailSrc: '/media/foto-hd/2_immobilien.webp', title: 'Immobilien 01', tag: 'Foto', category: 'fotos' },
  { id: 'foto-3-architektur', src: '/media/foto-square/3_architektur.jpg', detailSrc: '/media/foto-hd/3_architektur.jpg', title: 'Architektur 01', tag: 'Foto', category: 'fotos' },
  { id: 'foto-4-immobilien', src: '/media/foto-square/4_immobilien.jpg', detailSrc: '/media/foto-hd/4_immobilien.jpg', title: 'Immobilien 02', tag: 'Foto', category: 'fotos' },
  { id: 'foto-5-immobilien', src: '/media/foto-square/5_immobilien.jpg', detailSrc: '/media/foto-hd/5_immobilien.jpg', title: 'Immobilien 03', tag: 'Foto', category: 'fotos' },
  { id: 'foto-6-immobilien', src: '/media/foto-square/6_immobilien.jpg', detailSrc: '/media/foto-hd/6_immobilien.jpg', title: 'Immobilien 04', tag: 'Foto', category: 'fotos' },
  { id: 'foto-7-immobilien', src: '/media/foto-square/7_immobilien.jpg', detailSrc: '/media/foto-hd/7_immobilien.jpg', title: 'Immobilien 05', tag: 'Foto', category: 'fotos' },
  { id: 'foto-8-immobilien', src: '/media/foto-square/8_immobilien.jpg', detailSrc: '/media/foto-hd/8_immobilien.jpg', title: 'Immobilien 06', tag: 'Foto', category: 'fotos' },
  { id: 'foto-9-architektur', src: '/media/foto-square/9_architektur.jpg', detailSrc: '/media/foto-hd/9_architektur.jpg', title: 'Architektur 02', tag: 'Foto', category: 'fotos' },
  { id: 'foto-10-architektur', src: '/media/foto-square/10_architektur.jpg', detailSrc: '/media/foto-hd/10_architektur.jpg', title: 'Architektur 03', tag: 'Foto', category: 'fotos' },
  { id: 'foto-11-immobilien', src: '/media/foto-square/11_immobilien.png', detailSrc: '/media/foto-hd/11_immobilien.png', title: 'Immobilien 07', tag: 'Foto', category: 'fotos' },
  { id: 'foto-12-event', src: '/media/foto-square/12_event.jpg', detailSrc: '/media/foto-hd/12_event.jpg', title: 'Event 01', tag: 'Foto', category: 'fotos' },
  { id: 'foto-13-event', src: '/media/foto-square/13_event.jpg', detailSrc: '/media/foto-hd/13_event.jpg', title: 'Event 02', tag: 'Foto', category: 'fotos' },
  { id: 'foto-14-event', src: '/media/foto-square/14_event.webp', detailSrc: '/media/foto-hd/14_event.webp', title: 'Event 03', tag: 'Foto', category: 'fotos' },
  { id: 'foto-15-event', src: '/media/foto-square/15_event.webp', detailSrc: '/media/foto-hd/15_event.webp', title: 'Event 04', tag: 'Foto', category: 'fotos' },
  { id: 'foto-16-event', src: '/media/foto-square/16_event.jpg', detailSrc: '/media/foto-hd/16_event.jpg', title: 'Event 05', tag: 'Foto', category: 'fotos' },
  { id: 'foto-17-business', src: '/media/foto-square/17_business.webp', detailSrc: '/media/foto-hd/17_business.webp', title: 'Business 02', tag: 'Foto', category: 'fotos' },
  { id: 'foto-18-business', src: '/media/foto-square/18_business.webp', detailSrc: '/media/foto-hd/18_business.webp', title: 'Business 03', tag: 'Foto', category: 'fotos' },
  { id: 'foto-19-menschen', src: '/media/foto-square/19_menschen.webp', detailSrc: '/media/foto-hd/19_menschen.webp', title: 'Menschen 01', tag: 'Foto', category: 'fotos' },
  { id: 'foto-20-menschen', src: '/media/foto-square/20_menschen.jpg', detailSrc: '/media/foto-hd/20_menschen.jpg', title: 'Menschen 02', tag: 'Foto', category: 'fotos' },
  { id: 'foto-21-menschen', src: '/media/foto-square/21_menschen.jpg', detailSrc: '/media/foto-hd/21_menschen.jpg', title: 'Menschen 03', tag: 'Foto', category: 'fotos' },
  { id: 'foto-22-menschen', src: '/media/foto-square/22_menschen.jpg', detailSrc: '/media/foto-hd/22_menschen.jpg', title: 'Menschen 04', tag: 'Foto', category: 'fotos' },
  { id: 'foto-23-menschen', src: '/media/foto-square/23_menschen.jpg', detailSrc: '/media/foto-hd/23_menschen.jpg', title: 'Menschen 05', tag: 'Foto', category: 'fotos' },
  { id: 'foto-24-menschen', src: '/media/foto-square/24_menschen.jpg', detailSrc: '/media/foto-hd/24_menschen.jpg', title: 'Menschen 06', tag: 'Foto', category: 'fotos' },
  { id: 'foto-25-menschen', src: '/media/foto-square/25_menschen.jpg', detailSrc: '/media/foto-hd/25_menschen.jpg', title: 'Menschen 07', tag: 'Foto', category: 'fotos' },
  { id: 'foto-26-business', src: '/media/foto-square/26_business.jpg', detailSrc: '/media/foto-hd/26_business.jpg', title: 'Business 04', tag: 'Foto', category: 'fotos' },
  { id: 'foto-27-business', src: '/media/foto-square/27_business.jpg', detailSrc: '/media/foto-hd/27_business.jpg', title: 'Business 05', tag: 'Foto', category: 'fotos' },
  { id: 'foto-28-business', src: '/media/foto-square/28_business.jpg', detailSrc: '/media/foto-hd/28_business.jpg', title: 'Business 06', tag: 'Foto', category: 'fotos' },
  { id: 'foto-29-event', src: '/media/foto-square/29_event.jpg', detailSrc: '/media/foto-hd/29_event.jpg', title: 'Event 06', tag: 'Foto', category: 'fotos' },
  { id: 'foto-30-architektur', src: '/media/foto-square/30_architektur.jpg', detailSrc: '/media/foto-hd/30_architektur.jpg', title: 'Architektur 04', tag: 'Foto', category: 'fotos' },

  {
    id: '600kids',
    src: '/media/web-projects/600kids/cover.webp',
    detailSrc: '/media/web-projects/600kids/cover.webp',
    aspectRatio: 1512 / 924,
    images: [
      '/media/web-projects/600kids/cover.webp',
      '/media/web-projects/600kids/02-bildschirmfoto-2024-01-24-um-16-28.webp',
      '/media/web-projects/600kids/03-bildschirmfoto-2024-01-24-um-16-29.webp',
      '/media/web-projects/600kids/04-bildschirmfoto-2024-01-24-um-16-30.webp',
    ],
    title: '600 Kids',
    tag: 'Web',
    category: 'apps',
  },
  {
    id: 'crewting',
    src: '/media/web-projects/crewting/cover.webp',
    detailSrc: '/media/web-projects/crewting/cover.webp',
    aspectRatio: 1512 / 978,
    images: [
      '/media/web-projects/crewting/cover.webp',
      '/media/web-projects/crewting/02-frame-46.webp',
      '/media/web-projects/crewting/03-post-2.webp',
      '/media/web-projects/crewting/04-thumb-1.webp',
      '/media/web-projects/crewting/05-who-knows-who.webp',
    ],
    title: 'Crewting',
    tag: 'Web',
    category: 'apps',
  },
  {
    id: 'jakobs',
    src: '/media/web-projects/jakobs/cover.webp',
    detailSrc: '/media/web-projects/jakobs/cover.webp',
    aspectRatio: 906 / 1283,
    images: [
      '/media/web-projects/jakobs/cover.webp',
      '/media/web-projects/jakobs/02-autofill.webp',
      '/media/web-projects/jakobs/03-bericht.webp',
      '/media/web-projects/jakobs/04-pro-display-xdr.webp',
    ],
    title: 'Jakobs',
    tag: 'Web',
    category: 'apps',
  },
  {
    id: 'leasehub',
    src: '/media/web-projects/leasehub/cover.webp',
    detailSrc: '/media/web-projects/leasehub/cover.webp',
    aspectRatio: 1512 / 1013,
    images: [
      '/media/web-projects/leasehub/cover.webp',
      '/media/web-projects/leasehub/02-dahsboard.webp',
      '/media/web-projects/leasehub/03-kunden-zugang-detail.webp',
      '/media/web-projects/leasehub/04-rectangle.webp',
    ],
    title: 'Leasehub',
    tag: 'Web',
    category: 'apps',
  },
  {
    id: 'pms',
    src: '/media/web-projects/pms/cover.webp',
    detailSrc: '/media/web-projects/pms/cover.webp',
    aspectRatio: 1512 / 983,
    images: [
      '/media/web-projects/pms/cover.webp',
      '/media/web-projects/pms/02-15-workflow-settings.webp',
      '/media/web-projects/pms/03-15-workflow.webp',
      '/media/web-projects/pms/04-51-pd-editor-browser.webp',
    ],
    title: 'PMS',
    tag: 'Web',
    category: 'apps',
  },
  {
    id: 'tososto',
    src: '/media/web-projects/tososto/cover.webp',
    detailSrc: '/media/web-projects/tososto/cover.webp',
    aspectRatio: 1512 / 1039,
    images: [
      '/media/web-projects/tososto/cover.webp',
      '/media/web-projects/tososto/02-e-mail.webp',
      '/media/web-projects/tososto/03-inserat-erstellen.webp',
      '/media/web-projects/tososto/04-inserate.webp',
      '/media/web-projects/tososto/05-karte.webp',
      '/media/web-projects/tososto/06-referenzen-1.webp',
    ],
    title: 'Tososto',
    tag: 'Web',
    category: 'apps',
  },

  { id: 'video-drone', src: '/media/thumbs/video-drone.webp', detailSrc: '/media/detail/video-drone.webp', title: 'Drohne', tag: 'Video', category: 'videos' },
  { id: 'video-event', src: '/media/thumbs/video-event.webp', detailSrc: '/media/detail/video-event.webp', title: 'Event Film', tag: 'Video', category: 'videos' },
  { id: 'video-brand', src: '/media/thumbs/video-brand.webp', detailSrc: '/media/detail/video-brand.webp', title: 'Brand Film', tag: 'Video', category: 'videos' },
  { id: 'video-social', src: '/media/thumbs/video-social.webp', detailSrc: '/media/detail/video-social.webp', title: 'Social Cut', tag: 'Video', category: 'videos' },
  { id: 'video-motion', src: '/media/thumbs/video-motion.webp', detailSrc: '/media/detail/video-motion.webp', title: 'Motion', tag: 'Video', category: 'videos' },
  { id: 'video-story', src: '/media/thumbs/video-story.webp', detailSrc: '/media/detail/video-story.webp', title: 'Story', tag: 'Video', category: 'videos' },
  { id: 'video-lab', src: '/media/thumbs/video-lab.webp', detailSrc: '/media/detail/video-lab.webp', title: 'Lab', tag: 'Video', category: 'videos' },
  { id: 'video-konferenz', src: '/media/thumbs/video-konferenz.webp', detailSrc: '/media/detail/video-konferenz.webp', title: 'Konferenz', tag: 'Video', category: 'videos' },
];
