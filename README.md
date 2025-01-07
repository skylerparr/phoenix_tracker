# Phoenix Tracker

Rising from the ashes of a beloved issue tracker. I was a fan, I'm sad it's gone. So I made my own.

![Phoenix Tracker Demo](media/issueTracker.gif)

## Development Setup

1. Create the SQLite database file:
```bash
mkdir -p data && touch data/app.db
```
2. Start the development server:
```bash
docker compose up
```
3. Run migrations
```bash
docker exec -it phoenix-tracker-backend-1 sea-orm-cli migrate fresh --database-url sqlite:/data/app.db
```

## Tools

Source the `.proj` files to get easy aliases.

## TODO

* I'm currently using the issue tracker to track my issues for this project. I need to create 
a github login and host it someplace.
* There's a couple of security issues to address in order to make it public.

## Show me some love

Give me some stars so I can see who's interested.
