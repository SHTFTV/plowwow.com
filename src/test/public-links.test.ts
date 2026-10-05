import { expect, test } from 'vitest';
import { publicLink } from '@/lib/publicLinks';
test('old internal links reach their canonical destination',()=>{
 expect(publicLink('https://plowwow.com/mertrotown-snow-removal/')).toBe('/burnaby');
 expect(publicLink('/feed/')).toBe('/rss.xml');
 expect(publicLink('https://plowwow.com/strata-guide/%20https//plowwow.com')).toBe('/strata-guide');
});
test('external destinations and page fragments are preserved',()=>{
 expect(publicLink('https://vancouver.ca/streets-transportation/snow.aspx')).toBe('https://vancouver.ca/streets-transportation/snow.aspx');
 expect(publicLink('#contact')).toBe('#contact');
 expect(publicLink('mailto:wow@plowwow.com')).toBe('mailto:wow@plowwow.com');
});
