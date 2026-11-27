# REQ-900: Guest Searches a Product from the Header

## Metadata
- ID: REQ-900
- Area: header
- Source: manual
- Author: Claude

## Goal
Eval fixture for `yarn harness:eval write-plan` (copied to `knowledge-base/requirements/` for the scenario and deleted afterwards; never implemented). A guest uses the search box in the header to find a product by name and sees the matching products on the search results page, so they can open a product without browsing the categories.

## Scope
### In Scope
- Searching from the header search box as a guest.
- The search results page: list of matching products, or the no-results message.

### Out of Scope
- Advanced search options (category, price range, manufacturer).
- Search suggestions while typing.
- Logged-in users.

## Preconditions
- The guest is on the home page.
- The catalogue contains a product whose name contains the search term.

## Actors
- Guest user.

## User Flow
1. The guest types a product name into the header search box.
2. The guest submits the search.
3. The system shows the search results page.
4. The results list the products whose name matches the term.

## Acceptance Criteria
- [ ] AC1: Submitting a search term from the header opens the search results page.
- [ ] AC2: Every product listed on the results page has the search term in its name.
- [ ] AC3: At least one product is listed for a term that matches an existing product.

## Expected Results
- The search results page lists the matching products.
- The search term is kept in the search field of the results page.

## Error Cases
- E1: When the term matches no product, the system shows the no-results message and lists no product.

## Test Data
- Search term that matches products (from SIT test data).
- Search term that matches no product (from SIT test data).

## Notes
- Fixture only: the scenario checks that `/write-plan` turns it into a valid `Status: Draft` plan.
