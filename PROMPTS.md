Launcher icon
First find out why the launcher icon in the homescreen why it is showing the different image
for the laucher icon use this image assets/android-icon-monochrome.png with really good background image 
why the launcher icon still has this black wheel as the logo change that to our choosen launcher icon 

Splash screen 
check if the splash screen is working well or not 


# ISSUES
  ## ISSUE 1: MOBILE APP IS NOT ADAPTIVE TO EVERY SCREEN TYPE 
  - all the component's size should be adaptive with the device's screen size 
  - the size of font, elements inside the parents component should change with the parent's container
  - In the different modes of the display screen like the portrait, landscape, the application should be adaptive
  


  ## ISSUE 2: TOKENS ARE NOT CONSISTENT
  - all color, spacing, radius, type size, shadow and layout values come from src/theme/tokens.ts
  - Never hard-code hex, px, or font sizes in screens/components.
  - Colors: use const t = useTokens(), then t.primary, t.surfaceCard, t.textPrimary, etc.
  - Spacing, corners, text, shadow: use space.*, uiRadius.*, uiType.*, layout.*, shadow(...)
  - Screens: take size from the window (size class, screenPadding, useResponsiveType()).
  - Components: take size from the parent, not the window. Use flex and flexWrap first.
    Use minItem and maxContent for limits. Use onLayout only if you really need
    to measure the parent. Never use useWindowDimensions inside a reusable component.
  - Text inside components: use uiType.* as it is. If text does not fit, let it wrap
    or use numberOfLines. Do not make the font smaller.
  - Buttons and touch areas must be at least layout.minTouch.


about the recent done things does they work nicely mean are they comes from the notes or it is just dummy , can you make it dynamic and hold all the recent records and make it an accordion so it should be collapsable 
about the side bar pulled from the right side can you make it in a different way , let's do it put a menu icon on the right top and when i click on it make a wheel that carries all those tabs so we can choose and the wheel should be rotate and put a small compass type when correctly put then the menu selected in a really unique way first decide how can we implement this new wheel tabbar 


make the caching system in this app very nicely do good caching and instead of loading everywhere store as the json at first and with change you can update continously if you need but decide what you want and decide yourself


MY day Page
- in the my day page, below heading my day put this "Recording my days before my goldfish brain deletes it"
when adding new record
- remove the horizontal sliding tabs and the vertical sliding tabs and right sidebar tab too 
- about my day in the mood list put two more replace okay with "fine" and replace wired with "worse",  add "wooow" one 
- instead of "Archive memory" replace the text with "record my Day"
- in heading "log new memory" remove that and replace with "How was your day?"
- remove optional from the side of the image above upload image just image fine and remove remote image Url input 

Chronos and task page
- In the task page make the task horizontally slide 
- as a heading instead of chronos taskflow put the heading "Tasks"
- remove the refresh type of icon and put a small note saying "one step at a time"
- about the adding system, at the right side of the heading put the + icon btn  

About the goal page everything is good just change the note "Going to the destination!"

Watchlist page
- remove the collection info 
- remove "back" btn
- for note below title put "exploring new story each day"
- when adding the heading "adding new entry" replace that with "recording new achievement"
- remove emojis from this whole page 
- for the editing and deleting put the small svg icons and put it on the right top side bcz they are not needed everytime 
- remove the tag and btn "personal collection at top"
- when clicked the list then show the edit and the delete icon 
- when adding new record for status changes all of them to "processing", "completed", "plan to start", "On Hold", "Dropped"


Tab bar wheel
- about the navigation wheel no dark theme but a light colored mean match to the whole porject and also the wheel should be more smooth and choose one should have different background color and  the icon color changed
- about the tab choose when we move already and kept no need to click just go to that page 
- no need to write angle or degree 
- about the choosen make it more focus like scaled little more like it is superior mean come little up animation
- make the whole wheel so interactive and smooth to use 



for the recent done things replace to the things that needs to be done or somethings like do it and then the list of tasks from the task table but only the not done tasks and today's date otherwise so empty  so i should find out what are the tasks left to do or i need to do 

and below that remove that tabs to navigate vertical scrolling lists 

for the menu icon to open the wheel make it a circle icon inside the box show it should show like a transition that circle to the wheel so smooth

also wheel is waiting too much time just a small duration before navigation decrease that time 