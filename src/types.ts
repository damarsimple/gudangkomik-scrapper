export interface Comic {
    name: string;
    alt_name: string[];
    slug: string;
    genres: string[];
    description?: string;
    status?: string;
    rating: string;
    thumb: string;
    thumb_wide?: string;
    is_hentai: boolean;
    released?: Date;

    author: string;
    colored: boolean;

    age?: string;
    type?: string;
    concept?: string;

}

export interface Chapter {
    name: string;
    title?: string;
    image_count: number;
    original_image_count: number;

    processed: boolean;

    images: string[];
    quality: number

}

export interface ChapterCandidate {
    name: string
    href: string
}