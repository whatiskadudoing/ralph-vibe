// Tests for UnorderedList and OrderedList components
// These components render bullet-point or numbered lists
import React from "react";
import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { Box, Text } from "../src/mod.ts";
import { renderToString, initYoga } from "./helpers.ts";

await initYoga();

// UnorderedList Tests

Deno.test("unordered-list: renders items with bullets", () => {
  // TODO: Implement when UnorderedList component is added
  // const output = renderToString(
  //   <UnorderedList>
  //     <ListItem>First item</ListItem>
  //     <ListItem>Second item</ListItem>
  //     <ListItem>Third item</ListItem>
  //   </UnorderedList>
  // );
  //
  // assertStringIncludes(output, "• First item");
  // assertStringIncludes(output, "• Second item");
  // assertStringIncludes(output, "• Third item");
});

Deno.test("unordered-list: supports custom marker", () => {
  // TODO: Implement when UnorderedList component is added
  // const output = renderToString(
  //   <UnorderedList marker="-">
  //     <ListItem>Item</ListItem>
  //   </UnorderedList>
  // );
  //
  // assertStringIncludes(output, "- Item");
});

Deno.test("unordered-list: supports nested lists", () => {
  // TODO: Implement when UnorderedList component is added
  // const output = renderToString(
  //   <UnorderedList>
  //     <ListItem>Parent</ListItem>
  //     <ListItem>
  //       <UnorderedList>
  //         <ListItem>Child</ListItem>
  //       </UnorderedList>
  //     </ListItem>
  //   </UnorderedList>
  // );
  //
  // // Verify indentation for nested list
});

Deno.test("unordered-list: items render on separate lines", () => {
  // TODO: Implement when UnorderedList component is added
  // const output = renderToString(
  //   <UnorderedList>
  //     <ListItem>A</ListItem>
  //     <ListItem>B</ListItem>
  //   </UnorderedList>
  // );
  //
  // const lines = output.split("\n");
  // assertEquals(lines.length >= 2, true);
});

// OrderedList Tests

Deno.test("ordered-list: renders items with numbers", () => {
  // TODO: Implement when OrderedList component is added
  // const output = renderToString(
  //   <OrderedList>
  //     <ListItem>First</ListItem>
  //     <ListItem>Second</ListItem>
  //     <ListItem>Third</ListItem>
  //   </OrderedList>
  // );
  //
  // assertStringIncludes(output, "1. First");
  // assertStringIncludes(output, "2. Second");
  // assertStringIncludes(output, "3. Third");
});

Deno.test("ordered-list: supports custom start number", () => {
  // TODO: Implement when OrderedList component is added
  // const output = renderToString(
  //   <OrderedList start={5}>
  //     <ListItem>Item</ListItem>
  //   </OrderedList>
  // );
  //
  // assertStringIncludes(output, "5. Item");
});

Deno.test("ordered-list: supports nested lists", () => {
  // TODO: Implement when OrderedList component is added
  // const output = renderToString(
  //   <OrderedList>
  //     <ListItem>Parent</ListItem>
  //     <ListItem>
  //       <OrderedList>
  //         <ListItem>Child</ListItem>
  //       </OrderedList>
  //     </ListItem>
  //   </OrderedList>
  // );
  //
  // // Verify indentation and numbering for nested list
});

Deno.test("ordered-list: numbers align with padding", () => {
  // TODO: Implement when OrderedList component is added
  // For lists with >9 items, numbers should align properly
  // const items = Array.from({ length: 12 }, (_, i) => (
  //   <ListItem key={i}>Item {i + 1}</ListItem>
  // ));
  //
  // const output = renderToString(
  //   <OrderedList>{items}</OrderedList>
  // );
  //
  // // Verify alignment (e.g., " 1." and "10.")
});

// ListItem Tests

Deno.test("list-item: renders children", () => {
  // TODO: Implement when ListItem component is added
  // const output = renderToString(
  //   <UnorderedList>
  //     <ListItem>
  //       <Text color="green">Styled</Text> content
  //     </ListItem>
  //   </UnorderedList>
  // );
  //
  // assertStringIncludes(output, "Styled");
  // assertStringIncludes(output, "content");
});
