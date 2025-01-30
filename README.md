# Phoenix Tracker

Rising from the ashes of a beloved issue tracker. I was a fan, I'm sad it's gone. So I made my own.

![Phoenix Tracker Demo](https://github.com/skylerparr/phoenix_tracker/blob/main/media/IssueTracker.gif?raw=true)

## Development Setup

1. Start the development server:
```bash
docker compose up
```
2. Run migrations
```bash
docker exec -it phoenix-tracker-backend-1 sea-orm-cli migrate fresh --database-url postgresql://postgres:postgres@postgres:5432/phoenix_tracker
```
3. Navigate to http://localhost:3000
   
## Tools

Source the `.proj` files to get easy aliases.

## TODO

* I'm currently using the issue tracker to track my issues for this project. I need to create 
a github login and host it someplace.
* There's a couple of security issues to address in order to make it public.

## Show me some love

Give me some stars so I can see who's interested.
