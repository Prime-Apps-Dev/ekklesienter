import { BibleData } from '../types';

export const INITIAL_DATA: BibleData = {
  translation: {
    id: 'KJV',
    name: 'King James Version',
    language: 'en'
  },
  books: [
    { bookId: 'GEN', translationId: 'KJV', name: 'Genesis', chapters: [1] },
    { bookId: 'JHN', translationId: 'KJV', name: 'John', chapters: [1] }
  ],
  verses: [
    // Genesis 1
    {
      translationId: 'KJV',
      bookId: 'GEN',
      chapter: 1,
      verseNumber: 1,
      text: "In the beginning **God** created the heaven and the earth."
    },
    {
      translationId: 'KJV',
      bookId: 'GEN',
      chapter: 1,
      verseNumber: 2,
      text: "And the earth was without form, and void; and darkness was upon the face of the deep. And the Spirit of **God** moved upon the face of the waters."
    },
    {
      translationId: 'KJV',
      bookId: 'GEN',
      chapter: 1,
      verseNumber: 3,
      text: "And **God** said, Let there be light: and there was light."
    },
    {
      translationId: 'KJV',
      bookId: 'GEN',
      chapter: 1,
      verseNumber: 4,
      text: "And **God** saw the light, that it was good: and **God** divided the light from the darkness."
    },
    {
      translationId: 'KJV',
      bookId: 'GEN',
      chapter: 1,
      verseNumber: 5,
      text: "And **God** called the light Day, and the darkness he called Night. And the evening and the morning were the first day."
    },
    // John 1
    {
      translationId: 'KJV',
      bookId: 'JHN',
      chapter: 1,
      verseNumber: 1,
      text: "In the beginning was the **Word**, and the **Word** was with **God**, and the **Word** was **God**."
    },
    {
      translationId: 'KJV',
      bookId: 'JHN',
      chapter: 1,
      verseNumber: 2,
      text: "The same was in the beginning with **God**."
    },
    {
      translationId: 'KJV',
      bookId: 'JHN',
      chapter: 1,
      verseNumber: 3,
      text: "All things were made by him; and without him was not any thing made that was made."
    },
    {
      translationId: 'KJV',
      bookId: 'JHN',
      chapter: 1,
      verseNumber: 4,
      text: "In him was life; and the life was the light of men."
    },
    {
      translationId: 'KJV',
      bookId: 'JHN',
      chapter: 1,
      verseNumber: 5,
      text: "And the light shineth in darkness; and the darkness comprehended it not."
    }
  ]
};